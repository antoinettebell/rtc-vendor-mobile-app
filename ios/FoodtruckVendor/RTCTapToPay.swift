import Foundation
import React

@objc(RTCTapToPay)
final class RTCTapToPay: NSObject {
  @available(iOS 16.0, *)
  private lazy var manager = TapToPayManager()

  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(startSale:resolver:rejecter:)
  func startSale(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let amountString = stringValue(options["amount"])
    let amount = currencyAmount(from: amountString)
    Task { @MainActor in
      do {
        guard #available(iOS 16.0, *) else {
          throw NSError(domain: "RTCTapToPay", code: 403, userInfo: [
            NSLocalizedDescriptionKey: "Tap to Pay requires iOS 16 or later."
          ])
        }
        let reference = nullableStringValue(options["orderNumber"])
          ?? nullableStringValue(options["orderId"])
          ?? UUID().uuidString
        let result = try await manager.startSale(
          amount: amount,
          currency: .USD,
          environmentName: stringValue(options["environment"], fallback: "production"),
          reference: reference
        )
        resolve(result)
      } catch let error as NSError {
        reject(diagnosticCode(for: error), error.localizedDescription, error)
      } catch {
        reject(
          "E_TAP_TO_PAY_FAILED",
          error.localizedDescription,
          NSError(
            domain: "RTCTapToPay",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]
          )
        )
      }
    }
  }

  @objc(showMerchantEducation:rejecter:)
  func showMerchantEducation(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      do {
        guard #available(iOS 18.0, *),
              let viewController = TapToPayManager.topViewController() else {
          throw NSError(domain: "RTCTapToPay", code: 403, userInfo: [
            NSLocalizedDescriptionKey: "Tap to Pay education requires iOS 18 or later."
          ])
        }
        try await manager.showMerchantEducation(from: viewController)
        resolve(nil)
      } catch let error as NSError {
        reject(String(error.code), error.localizedDescription, error)
      }
    }
  }

  private func stringValue(_ value: Any?, fallback: String = "") -> String {
    guard let value else {
      return fallback
    }

    if let string = value as? String {
      return string
    }

    return String(describing: value)
  }

  private func nullableStringValue(_ value: Any?) -> String? {
    let string = stringValue(value).trimmingCharacters(in: .whitespacesAndNewlines)

    return string.isEmpty ? nil : string
  }

  private func diagnosticCode(for error: NSError) -> String {
    guard let stage = error.userInfo["tapToPayStage"] as? String,
          let domain = error.userInfo["tapToPayErrorDomain"] as? String,
          let code = error.userInfo["tapToPayErrorCode"] as? Int,
          let diagnostic = error.userInfo["tapToPayErrorDiagnostic"] as? [String: Any],
          JSONSerialization.isValidJSONObject(diagnostic),
          let data = try? JSONSerialization.data(withJSONObject: diagnostic),
          let json = String(data: data, encoding: .utf8),
          let encodedDiagnostic = json.addingPercentEncoding(
            withAllowedCharacters: .alphanumerics
          ) else {
      return String(error.code)
    }

    return "TAP_TO_PAY|\(stage)|\(domain)|\(code)|\(encodedDiagnostic)"
  }

  private func currencyAmount(from value: String) -> Decimal {
    guard var amount = Decimal(
      string: value.trimmingCharacters(in: .whitespacesAndNewlines),
      locale: Locale(identifier: "en_US_POSIX")
    ) else {
      return 0
    }

    var rounded = Decimal()
    NSDecimalRound(&rounded, &amount, 2, .plain)
    return rounded
  }
}
