package com.ea.rtcvendor

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.google.android.gms.wallet.button.ButtonConstants
import com.google.android.gms.wallet.button.ButtonOptions
import com.google.android.gms.wallet.button.PayButton

class RTCGooglePayButtonManager : SimpleViewManager<PayButton>() {
  override fun getName() = "RTCGooglePayButton"

  override fun createViewInstance(reactContext: ThemedReactContext): PayButton =
    PayButton(reactContext).apply {
      initializeButton(this, DEFAULT_ALLOWED_PAYMENT_METHODS)
      setOnClickListener {
        reactContext.getJSModule(RCTEventEmitter::class.java)
          .receiveEvent(id, "topGooglePayPress", Arguments.createMap())
      }
    }

  @ReactProp(name = "allowedPaymentMethods")
  fun setAllowedPaymentMethods(view: PayButton, allowedPaymentMethods: String?) {
    if (!allowedPaymentMethods.isNullOrBlank()) {
      initializeButton(view, allowedPaymentMethods)
    }
  }

  @ReactProp(name = "disabled", defaultBoolean = false)
  fun setDisabled(view: PayButton, disabled: Boolean) {
    view.isEnabled = !disabled
    view.alpha = if (disabled) 0.55f else 1f
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    MapBuilder.of(
      "topGooglePayPress",
      MapBuilder.of("registrationName", "onGooglePayPress"),
    )

  private fun initializeButton(view: PayButton, allowedPaymentMethods: String) {
    view.initialize(
      ButtonOptions.newBuilder()
        .setButtonType(ButtonConstants.ButtonType.PAY)
        .setButtonTheme(ButtonConstants.ButtonTheme.DARK)
        .setCornerRadius(8)
        .setAllowedPaymentMethods(allowedPaymentMethods)
        .build(),
    )
  }

  companion object {
    private const val DEFAULT_ALLOWED_PAYMENT_METHODS =
      "[{\"type\":\"CARD\",\"parameters\":{\"allowedAuthMethods\":[\"PAN_ONLY\",\"CRYPTOGRAM_3DS\"],\"allowedCardNetworks\":[\"VISA\",\"MASTERCARD\"]}}]"
  }
}
