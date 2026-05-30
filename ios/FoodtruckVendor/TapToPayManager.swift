import Foundation
import ProximityReader

#if canImport(AcceptanceDevicesSDK)
import AcceptanceDevicesSDK
#endif

@objc class TapToPayManager: NSObject {
  private static let sandboxVMID = "abell_dev"
  private static let sandboxTID = "TEST_TID_01"
  private static let sandboxSecret = "PROXIMITY_READER_DEMO_SECRET"

  private var isInitialized = false
  private var currentTeamId: String?

  @objc func initializeTerminal(appleTeamId: String) async throws -> Bool {
    let trimmedTeamId = appleTeamId.trimmingCharacters(in: .whitespacesAndNewlines)

    guard !trimmedTeamId.isEmpty else {
      throw NSError(
        domain: "TapToPayError",
        code: 400,
        userInfo: [
          NSLocalizedDescriptionKey: "Apple Team ID configuration string cannot be empty."
        ]
      )
    }

    currentTeamId = trimmedTeamId

    #if canImport(AcceptanceDevicesSDK)
    do {
      let config = TerminalConfiguration(
        merchantId: Self.sandboxVMID,
        terminalId: Self.sandboxTID,
        appleTeamId: trimmedTeamId,
        sharedSecret: Self.sandboxSecret,
        environment: .sandbox
      )

      try await TerminalManager.shared.initialize(with: config)
      isInitialized = true
      return true
    } catch {
      throw NSError(
        domain: "CybersourceSDKError",
        code: 500,
        userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]
      )
    }
    #else
    print("[TapToPayManager] AcceptanceDevicesSDK is not present. Local sandbox staging emulation enabled.")
    isInitialized = true
    return true
    #endif
  }

  @objc func executePaymentSheet(amount: Double) async throws -> String {
    guard isInitialized else {
      throw NSError(
        domain: "TapToPayError",
        code: 401,
        userInfo: [
          NSLocalizedDescriptionKey: "Terminal engine must be initialized before processing payments."
        ]
      )
    }

    guard amount > 0 else {
      throw NSError(
        domain: "TapToPayError",
        code: 400,
        userInfo: [
          NSLocalizedDescriptionKey: "Transaction checkout amount must be greater than zero."
        ]
      )
    }

    guard #available(iOS 15.4, *) else {
      throw NSError(
        domain: "AppleHardwareError",
        code: 403,
        userInfo: [
          NSLocalizedDescriptionKey: "Tap to Pay on iPhone requires iOS 15.4 or later."
        ]
      )
    }

    guard PaymentCardReader.isSupported else {
      throw NSError(
        domain: "AppleHardwareError",
        code: 403,
        userInfo: [
          NSLocalizedDescriptionKey: "This physical iOS device does not support Tap to Pay hardware components."
        ]
      )
    }

    #if canImport(AcceptanceDevicesSDK)
    do {
      let transactionParameters = TransactionParameters(amount: amount, currency: "USD")
      let paymentResponse = try await TerminalManager.shared.readCard(parameters: transactionParameters)
      return paymentResponse.transactionToken
    } catch {
      throw NSError(
        domain: "CybersourceTransactionError",
        code: 502,
        userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]
      )
    }
    #else
    print("[TapToPayManager] Simulating physical hardware proximity read loop for amount: $\(amount)...")
    try await Task.sleep(nanoseconds: 2_000_000_000)

    if amount == 999.0 {
      throw NSError(
        domain: "AppleHardwareError",
        code: 99,
        userInfo: [
          NSLocalizedDescriptionKey: "User cancelled the proximity hardware card-read session window interaction."
        ]
      )
    }

    print("[TapToPayManager] Simulated NFC chip collection successful.")
    return "MOCK_TOKEN_SUCCESS_SANDBOX"
    #endif
  }
}
