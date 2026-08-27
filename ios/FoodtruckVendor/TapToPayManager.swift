import Foundation
import MposUI
import ProximityReader
import UIKit

@available(iOS 16.0, *)
@objc final class TapToPayManager: NSObject {
  private var reader: MposUIReader?
  private let reactivationCompletedKey = "RTCTapToPayReactivationCompleted"

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
      throw NSError(domain: "RTCTapToPay", code: 503, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay is not configured on this build."
      ])
    }

    return try Credentials(merchantId: merchantId!, secret: secret!)
  }

  private func configuredReader(environment: MposEnvironment) async throws -> MposUIReader {
    if let reader { return reader }

    let configuration = Configuration(
      resultConfiguration: .displayIndefinitely,
      summaryFeatures: [.sendReceiptViaEmail, .refundTransaction, .retryTransaction],
      signatureCapture: .onScreen,
      enrollmentConfiguration: .init(
        serialNumberInputMethod: .deviceList,
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
  // trying to delete its Keychain state. It is intended for one-time recovery
  // when the gateway terminal is pending setup but the SDK has stale local
  // activation state.
  private var shouldForceReactivation: Bool {
    guard let configuredValue = Bundle.main.object(
      forInfoDictionaryKey: "CybersourceTapToPayResetEnrollment"
    ) as? String else {
      return false
    }

    let enabledValues = ["true", "yes", "1"]
    return enabledValues.contains(
      configuredValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    ) && !UserDefaults.standard.bool(forKey: reactivationCompletedKey)
  }

  private func ensureActivated(
    _ reader: MposUIReader,
    environment: MposEnvironment,
    forceReactivation: Bool = false
  ) async throws -> Bool {
    if !forceReactivation, case .activated = await reader.activationStatus { return false }

    let activation = await reader.activation()
    let result = await activation.activateWithOtp(environment: environment, otp: nil)
    switch result {
    case .success(_, let isNewDevice):
      if forceReactivation {
        UserDefaults.standard.set(true, forKey: reactivationCompletedKey)
      }
      return isNewDevice
    case .cancelledByUser:
      throw NSError(domain: "RTCTapToPay", code: 499, userInfo: [
        NSLocalizedDescriptionKey: "Device activation was cancelled."
      ])
    case .invalidOTP:
      throw NSError(domain: "RTCTapToPay", code: 401, userInfo: [
        NSLocalizedDescriptionKey: "The activation code was not accepted."
      ])
    case .error:
      throw NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Device activation failed."
      ])
    @unknown default:
      throw NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Device activation returned an unknown result."
      ])
    }
  }

  private func transactionFailure(_ error: Error) -> NSError {
    let sdkError = error as NSError

    NSLog(
      "[RTCTapToPay] transaction failure sdk_domain=%@ sdk_code=%ld",
      sdkError.domain,
      sdkError.code
    )

    return NSError(domain: "RTCTapToPay", code: 502, userInfo: [
      NSLocalizedDescriptionKey: "Tap to Pay transaction could not be completed."
    ])
  }

  @MainActor
  func startSale(amount: Decimal, currency: Currency, environmentName: String, reference: String) async throws -> [String: Any] {
    guard amount > 0 else {
      throw NSError(domain: "RTCTapToPay", code: 400, userInfo: [
        NSLocalizedDescriptionKey: "Transaction amount must be greater than zero."
      ])
    }

    let environment = environment(from: environmentName)
    let activeReader = try await configuredReader(environment: environment)
    let newlyActivated = try await ensureActivated(
      activeReader,
      environment: environment,
      forceReactivation: shouldForceReactivation
    )
    if #available(iOS 18.0, *),
       newlyActivated,
       let viewController = Self.topViewController() {
      try await showMerchantEducation(from: viewController)
    }
    let online = try await activeReader.mposUIOnline()
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
      NSLog("[RTCTapToPay] transaction result=pay_by_link_fallback")
      throw NSError(domain: "RTCTapToPay", code: 409, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay was unavailable. Please retry when the iPhone is online."
      ])
    case .failure(let error):
      throw transactionFailure(error)
    @unknown default:
      NSLog("[RTCTapToPay] transaction result=unknown")
      throw NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay returned an unknown result."
      ])
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
