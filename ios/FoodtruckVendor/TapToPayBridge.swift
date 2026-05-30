import Foundation
import React

@objc(TapToPayBridge)
class TapToPayBridge: NSObject {
  private let manager = TapToPayManager()

  @objc func initializeTTP(
    _ config: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let teamId = config["appleTeamId"] as? String ?? ""

    Task {
      do {
        let success = try await manager.initializeTerminal(appleTeamId: teamId)
        resolve(success)
      } catch let error as NSError {
        reject(String(error.code), error.localizedDescription, error)
      }
    }
  }

  @objc func startPayment(
    _ amount: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        let tokenResult = try await manager.executePaymentSheet(amount: amount)
        resolve(tokenResult)
      } catch let error as NSError {
        reject(String(error.code), error.localizedDescription, error)
      }
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    true
  }
}
