import Foundation
import MposUI
import ProximityReader
import UIKit

@available(iOS 16.0, *)
@objc final class TapToPayManager: NSObject {
  private var reader: MposUIReader?

  private func safeNSErrorDiagnostic(
    _ error: NSError,
    remainingUnderlyingLevels: Int = 2
  ) -> [String: Any] {
    var diagnostic: [String: Any] = [
      "domain": error.domain,
      "code": error.code,
      "message": error.localizedDescription,
      "userInfoKeys": error.userInfo.keys.compactMap { $0 as? String }.sorted(),
    ]

    if let failureReason = error.localizedFailureReason {
      diagnostic["localizedFailureReason"] = failureReason
    }

    if remainingUnderlyingLevels > 0,
       let underlyingError = error.userInfo[NSUnderlyingErrorKey] as? NSError {
      diagnostic["underlying"] = safeNSErrorDiagnostic(
        underlyingError,
        remainingUnderlyingLevels: remainingUnderlyingLevels - 1
      )
    }

    return diagnostic
  }

  private func diagnosticError(_ error: Error, stage: String) -> NSError {
    let sdkError = error as NSError
    return NSError(domain: "RTCTapToPay", code: sdkError.code, userInfo: [
      NSLocalizedDescriptionKey: sdkError.localizedDescription,
      "tapToPayStage": stage,
      "tapToPayErrorDomain": sdkError.domain,
      "tapToPayErrorCode": sdkError.code,
      "tapToPayErrorDiagnostic": safeNSErrorDiagnostic(sdkError),
    ])
  }

  private func transactionFailure(_ error: Error) -> NSError {
    diagnosticError(error, stage: "charge_result")
  }

  private func environment(from value: String) -> MposEnvironment {
    value.lowercased() == "sandbox" || value.lowercased() == "test" ? .test : .live
  }

  private func credentials() throws -> Credentials {
    let merchantId = Bundle.main.object(
      forInfoDictionaryKey: "CybersourceTapToPayMerchantId"
    ) as? String
    let secret = Bundle.main.object(
      forInfoDictionaryKey: "CybersourceTapToPayAcceptanceDeviceSecret"
    ) as? String

    let isConfigured: (String?) -> Bool = { value in
      guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines) else {
        return false
      }
      return !value.isEmpty && !value.hasPrefix("$(")
    }

    guard isConfigured(merchantId), isConfigured(secret) else {
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 503, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay is not configured on this build."
      ]), stage: "credentials")
    }

    return try Credentials(merchantId: merchantId!, secret: secret!)
  }

  private func configuredReader(
    environment: MposEnvironment,
    forceReactivation: Bool
  ) async throws -> MposUIReader {
    if let reader { return reader }

    let configuration = Configuration(
      resultConfiguration: .displayIndefinitely,
      summaryFeatures: [.sendReceiptViaEmail, .refundTransaction, .retryTransaction],
      signatureCapture: .onScreen,
      enrollmentConfiguration: .init(
        // New devices use the SDK's normal activation path. Recovery builds
        // explicitly prompt for the serial copied from a failed enrollment.
        serialNumberInputMethod: forceReactivation ? .manualInput : .deviceList,
        confirmationScreenOption: .showWithSerialNumber
      )
    )
    // SDK 3.6+ requires this migration builder once for devices activated by
    // an earlier SDK. It migrates the existing activation into Apple Keychain.
    let newReader = await mposUiBuilder(
      credentials: try credentials(),
      environment: environment,
      configuration: configuration
    )
    reader = newReader
    return newReader
  }

  // This deliberately uses the SDK's supported reactivation flow rather than
  // trying to delete its Keychain state. A locally enabled reset must always
  // select manual serial entry: a previous failed or unintended activation
  // must not suppress the recovery flow.
  private var shouldForceReactivation: Bool {
    guard let configuredValue = Bundle.main.object(
      forInfoDictionaryKey: "CybersourceTapToPayResetEnrollment"
    ) as? String else {
      return false
    }

    let enabledValues = ["true", "yes", "1"]
    return enabledValues.contains(
      configuredValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    )
  }

  // Leave deviceId unset for the manual recovery flow. The SDK prompts the
  // merchant to enter the copied serial number itself.
  private var configuredDeviceId: String? {
    guard let value = Bundle.main.object(
      forInfoDictionaryKey: "CybersourceTapToPayDeviceId"
    ) as? String else {
      return nil
    }

    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty,
          !trimmed.hasPrefix("$(") else {
      return nil
    }
    return trimmed
  }

  private func ensureActivated(
    _ reader: MposUIReader,
    environment: MposEnvironment,
    forceReactivation: Bool = false
  ) async throws -> Bool {
    if !forceReactivation, case .activated = await reader.activationStatus { return false }

    let activation = await reader.activation()
    let result = await activation.activateWithOtp(
      environment: environment,
      otp: nil,
      deviceId: forceReactivation ? nil : configuredDeviceId
    )
    switch result {
    case .success(_, let isNewDevice):
      return isNewDevice
    case .cancelledByUser:
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 499, userInfo: [
        NSLocalizedDescriptionKey: "Device activation was cancelled."
      ]), stage: "activation")
    case .invalidOTP:
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 401, userInfo: [
        NSLocalizedDescriptionKey: "The activation code was not accepted."
      ]), stage: "activation")
    case .error:
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Device activation failed."
      ]), stage: "activation")
    @unknown default:
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Device activation returned an unknown result."
      ]), stage: "activation")
    }
  }

  @MainActor
  func startSale(amount: Decimal, currency: Currency, environmentName: String, reference: String) async throws -> [String: Any] {
    guard amount > 0 else {
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 400, userInfo: [
        NSLocalizedDescriptionKey: "Transaction amount must be greater than zero."
      ]), stage: "charge_start")
    }

    let environment = environment(from: environmentName)
    let forceReactivation = shouldForceReactivation
    let activeReader = try await configuredReader(
      environment: environment,
      forceReactivation: forceReactivation
    )
    let newlyActivated = try await ensureActivated(
      activeReader,
      environment: environment,
      forceReactivation: forceReactivation
    )
    if #available(iOS 18.0, *),
       newlyActivated,
       let viewController = Self.topViewController() {
      do {
        try await showMerchantEducation(from: viewController)
      } catch {
        throw diagnosticError(error, stage: "activation")
      }
    }
    let online: any MposUIOnline
    do {
      online = try await activeReader.mposUIOnline()
    } catch {
      throw diagnosticError(error, stage: "online_reader")
    }
    let parameters = ChargeParameters(amount: amount, currency: currency, customIdentifier: reference)
    let result = await online.startChargeTransaction(with: parameters)

    switch result {
    case .success(let transaction):
      return [
        "transactionId": transaction.identifier,
        "provider": "CYBERSOURCE",
        "environment": environmentName,
        "reference": reference
      ]
    case .offlineSuccess(let transaction):
      return [
        "transactionId": transaction.id,
        "provider": "CYBERSOURCE",
        "environment": environmentName,
        "reference": reference,
        "offline": true
      ]
    case .payByLinkFallback:
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 409, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay was unavailable. Please retry when the iPhone is online."
      ]), stage: "charge_result")
    case .failure(let error):
      throw transactionFailure(error)
    @unknown default:
      throw diagnosticError(NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay returned an unknown result."
      ]), stage: "charge_result")
    }
  }

  @available(iOS 18.0, *)
  @MainActor
  func showMerchantEducation(from viewController: UIViewController) async throws {
    let discovery = ProximityReaderDiscovery()
    let content = try await discovery.content(for: .payment(.howToTap))
    try await discovery.presentContent(content, from: viewController)
  }

  @MainActor
  static func topViewController(from base: UIViewController? = nil) -> UIViewController? {
    let root = base ?? UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)?
      .rootViewController
    if let navigation = root as? UINavigationController {
      return topViewController(from: navigation.visibleViewController)
    }
    if let tab = root as? UITabBarController {
      return topViewController(from: tab.selectedViewController)
    }
    if let presented = root?.presentedViewController {
      return topViewController(from: presented)
    }
    return root
  }
}
