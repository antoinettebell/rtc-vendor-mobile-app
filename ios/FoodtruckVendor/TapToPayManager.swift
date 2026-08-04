import Foundation
import MposUI
import ProximityReader
import UIKit

@available(iOS 16.0, *)
@objc final class TapToPayManager: NSObject {
  private var reader: MposUIReader?

  private func environment(from value: String) -> MposEnvironment {
    value.lowercased() == "sandbox" || value.lowercased() == "test" ? .test : .live
  }

  private func configuredReader() async throws -> MposUIReader {
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
    let newReader = await mposUIReaderBuilder(configuration: configuration)
    reader = newReader
    return newReader
  }

  private func ensureActivated(_ reader: MposUIReader, environment: MposEnvironment) async throws -> Bool {
    if case .activated = await reader.activationStatus { return false }

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

    let reader = try await configuredReader()
    let newlyActivated = try await ensureActivated(
      reader,
      environment: environment(from: environmentName)
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
      throw NSError(domain: "RTCTapToPay", code: 502, userInfo: [
        NSLocalizedDescriptionKey: "Tap to Pay transaction failed: \(error)"
      ])
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
