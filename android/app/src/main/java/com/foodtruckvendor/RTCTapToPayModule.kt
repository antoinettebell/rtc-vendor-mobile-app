package com.ea.rtcvendor

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class RTCTapToPayModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RTCTapToPay"

  @ReactMethod
  fun startSale(options: ReadableMap, promise: Promise) {
    promise.reject(
      "E_TAP_TO_PAY_NOT_CONFIGURED",
      "Tap to Pay native SDK is not configured. Install the Authorize.net/Cybersource Tap to Pay SDK bridge and map its sale result to RTCTapToPay.startSale."
    )
  }
}
