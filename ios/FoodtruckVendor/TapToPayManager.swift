import Foundation
import MposUI
import OSLog
import ProximityReader
import UIKit

@available(iOS 16.0, *)
@objc final class TapToPayManager: NSObject {
  private var reader: MposUIReader?
  private var readerEnvironment: MposEnvironment?
  private let diagnosticLogger = Logger(
    subsystem: Bundle.main.bundleIdentifier ?? "com.rounddacorner.vendor",
    category: "TapToPay"
  )

  private func safeDiagnosticText(_ value: String) -> String {
    let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
    let sensitiveMarkers = [
      "token", "secret", "authorization", "encrypted", "cryptogram",
      "cardnumber", "accountnumber", "primaryaccountnumber", " pan ",
    ]
    guard !sensitiveMarkers.contains(where: {
      normalized.lowercased().contains($0)
    }) else {
      return "[redacted]"
    }
    return String(normalized.prefix(512))
  }

  private func safeNSErrorDiagnostic(
    _ error: NSError,
    includeUnderlying: Bool = true
  ) -> [String: Any] {
    var diagnostic: [String: Any] = [
      "domain": error.domain,
      "code": error.code,
      "message": safeDiagnosticText(error.localizedDescription),
      "userInfoKeys": error.userInfo.keys.compactMap { $0 as? String }.sorted(),
    ]

    if let failureReason = error.localizedFailureReason {
      diagnostic["localizedFailureReason"] = safeDiagnosticText(failureReason)
    }

    if includeUnderlying,
       let underlying = error.userInfo[NSUnderlyingErrorKey] as? NSError {
      diagnostic["underlying"] = safeNSErrorDiagnostic(
        underlying,
        includeUnderlying: false
      )
    }

    return diagnostic
  }

  private func safeDeveloperInfo(from error: Error, nativeError: NSError) -> String? {
    if let value = nativeError.userInfo["developerInfo"] as? String {
      return safeDiagnosticText(value)
    }

    let reflected = String(describing: error)
    guard let range = reflected.range(of: "developerInfo:") else {
      return nil
    }
    return safeDiagnosticText(String(reflected[range.upperBound...]))
  }

  private func transactionFailure(_ error: Error) -> NSError {
    let nativeError = error as NSError
    var diagnostic = safeNSErrorDiagnostic(nativeError)
    let developerInfo = safeDeveloperInfo(from: error, nativeError: nativeError)
    if let developerInfo {
      diagnostic["developerInfo"] = developerInfo
    }
    let developerInfoForLog = developerInfo ?? "unavailable"

    diagnosticLogger.error(
      "[TapToPayDiagnostic] stage=charge_result domain=\(nativeError.domain, privacy: .public) code=\(nativeError.code, privacy: .public) developer_info=\(developerInfoForLog, privacy: .public)"
    )

    return NSError(domain: "RTCTapToPay", code: 502, userInfo: [
      NSLocalizedDescriptionKey: "Tap to Pay transaction failed: \(nativeError.localizedDescription)",
      "tapToPayStage": "charge_result",
      "tapToPayErrorDomain": nativeError.domain,
      "tapToPayErrorCode": nativeError.code,
      "tapToPayErrorDiagnostic": diagnostic,
    ])
  }

  private func environment(from value: String) -> MposEnvironment {
    value.lowercased() == "sandbox" || value.lowercased() == "test" ? .test : .live
  }

  private func requiredBuildSetting(_ key: String) throws -> String {
    let value = (Bundle.main.object(forInfoDictionaryKey: key) as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !value.isEmpty, !value.hasPrefix("$(") else {
      throw NSError(domain: "RTCTapToPay", code: 503, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay is missing the required native configuration: \(key)."
      ])
    }
    return value
  }

  private func configuredReader(environment: MposEnvironment) async throws -> MposUIReader {
    if let reader, readerEnvironment == environment { return reader }

    let merchantId = try requiredBuildSetting("CybersourceTapToPayMerchantId")
    let acceptanceDevicesSecret = try requiredBuildSetting(
      "CybersourceTapToPayAcceptanceDeviceSecret"
    )
    let credentials = try Credentials(
      merchantId: merchantId,
      secret: acceptanceDevicesSecret
    )

    let configuration = Configuration(
      resultConfiguration: .displayIndefinitely,
      summaryFeatures: [.sendReceiptViaEmail, .refundTransaction, .retryTransaction],
      signatureCapture: .onScreen,
      enrollmentConfiguration: .init(
        serialNumberInputMethod: .deviceList,
        confirmationScreenOption: .showWithSerialNumber
      )
    )
    diagnosticLogger.info(
      "[TapToPayDiagnostic] stage=reader_builder type=credentials environment=\(String(describing: environment), privacy: .public)"
    )
    let newReader = await mposUiBuilder(
      credentials: credentials,
      environment: environment,
      configuration: configuration
    )
    reader = newReader
    readerEnvironment = environment
    return newReader
  }

  private func ensureActivated(_ reader: MposUIReader, environment: MposEnvironment) async throws -> Bool {
    // The SDK persists activation outside the JavaScript configuration.  A
    // prior live enrollment must not satisfy a requested sandbox enrollment.
    if case .activated(let device) = await reader.activationStatus,
       device.environment == environment {
      return false
    }

    let activation = await reader.activation()
    let result = await activation.activateWithOtp(environment: environment, otp: nil)
    switch result {
    case .success(_, let isNewDevice):
      return isNewDevice
    case .cancelledByUser:
      throw NSError(domain: "RTCTapToPay", code: 499, userInfo: [
        NSLocalizedDescriptionKey: "Device activation was cancelled."
      ])
    case .invalidOTP(let info):
      throw NSError(domain: "RTCTapToPay", code: 401, userInfo: [
        NSLocalizedDescriptionKey: "The activation code was not accepted: \(info)"
      ])
    case .error(let info):
      throw NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Device activation failed: \(info)"
      ])
    @unknown default:
      throw NSError(domain: "RTCTapToPay", code: 500, userInfo: [
        NSLocalizedDescriptionKey: "Device activation returned an unknown result."
      ])
    }
  }

  @MainActor
  func startSale(amount: Decimal, currency: Currency, environmentName: String, reference: String) async throws -> [String: Any] {
    guard amount > 0 else {
      throw NSError(domain: "RTCTapToPay", code: 400, userInfo: [
        NSLocalizedDescriptionKey: "Transaction amount must be greater than zero."
      ])
    }

    let requestedEnvironment = environment(from: environmentName)
    let reader = try await configuredReader(environment: requestedEnvironment)
    let newlyActivated = try await ensureActivated(
      reader,
      environment: requestedEnvironment
    )
    if #available(iOS 18.0, *),
       newlyActivated,
       let viewController = Self.topViewController() {
      try await showMerchantEducation(from: viewController)
    }
    let online = try await reader.mposUIOnline()
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
      throw NSError(domain: "RTCTapToPay", code: 409, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay was unavailable. Please retry when the iPhone is online."
      ])
    case .failure(let error):
      throw transactionFailure(error)
    @unknown default:
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
