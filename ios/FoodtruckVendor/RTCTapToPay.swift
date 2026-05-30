import Foundation
import React

@objc(RTCTapToPay)
final class RTCTapToPay: NSObject {
  private let manager = TapToPayManager()

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
    let amount = Double(amountString) ?? 0
    let appleTeamId = stringValue(options["appleTeamId"])

    Task { @MainActor in
      do {
        _ = try await manager.initializeTerminal(appleTeamId: appleTeamId)
        let token = try await manager.executePaymentSheet(amount: amount)
        var raw: [String: Any] = [
          "provider": stringValue(options["provider"], fallback: "CYBERSOURCE"),
          "environment": stringValue(options["environment"], fallback: "sandbox")
        ]

        if let orderNumber = nullableStringValue(options["orderNumber"]) {
          raw["orderNumber"] = orderNumber
        }

        if let orderId = nullableStringValue(options["orderId"]) {
          raw["orderId"] = orderId
        }

        resolve([
          "opaqueToken": [
            "dataValue": token,
            "dataDescriptor": "COMMON.ACCEPT.INAPP.PAYMENT"
          ],
          "dataValue": token,
          "dataDescriptor": "COMMON.ACCEPT.INAPP.PAYMENT",
          "raw": raw
        ])
      } catch let error as NSError {
        reject(String(error.code), error.localizedDescription, error)
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
}
