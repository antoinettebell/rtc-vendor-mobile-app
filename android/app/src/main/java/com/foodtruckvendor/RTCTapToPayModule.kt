package com.ea.rtcvendor

import android.app.Activity
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import io.mpos.accessories.AccessoryFamily
import io.mpos.accessories.parameters.AccessoryParameters
import io.mpos.paybutton.ConfirmationScreenOption
import io.mpos.paybutton.MposUi
import io.mpos.paybutton.SerialNumberInputMethod
import io.mpos.paybutton.TapToPhoneConfiguration
import io.mpos.paybutton.UiConfiguration
import io.mpos.provider.ProviderMode
import io.mpos.transactions.Currency
import io.mpos.transactions.parameters.TransactionParameters
import java.math.BigDecimal

class RTCTapToPayModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
  private var mposUi: MposUi? = null
  private var pendingPromise: Promise? = null
  private var pendingReference: String? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "RTCTapToPay"

  @ReactMethod
  fun startSale(options: ReadableMap, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.reject("E_TAP_TO_PAY_ANDROID_VERSION", "Tap to Pay requires Android 12 or later.")
      return
    }
    if (pendingPromise != null) {
      promise.reject("E_TAP_TO_PAY_BUSY", "A Tap to Pay transaction is already active.")
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("E_TAP_TO_PAY_ACTIVITY", "Tap to Pay requires an active Android screen.")
      return
    }

    try {
      val amount = BigDecimal(requiredString(options, "amount"))
      require(amount > BigDecimal.ZERO) { "Transaction amount must be greater than zero." }
      val merchantId = requiredString(options, "merchantId")
      val merchantSecret = requiredString(options, "merchantSecret")
      val environment = optionalString(options, "environment").lowercase()
      val reference = optionalString(options, "orderNumber")
        .ifBlank { optionalString(options, "orderId") }
        .ifBlank { "rtc-${System.currentTimeMillis()}" }

      val reader = mposUi ?: MposUi.create(
        providerMode = if (environment == "sandbox" || environment == "test") {
          ProviderMode.TEST
        } else {
          ProviderMode.LIVE
        },
        merchantId = merchantId,
        merchantSecret = merchantSecret,
        terminalParameters = AccessoryParameters.Builder(AccessoryFamily.TAP_TO_PHONE)
          .integrated()
          .build()
      ).also {
        it.configuration = UiConfiguration.Builder().build()
        it.tapToPhone.tapToPhoneConfiguration = TapToPhoneConfiguration(
          serialNumberInputMethod = SerialNumberInputMethod.DEVICE_LIST,
          confirmationScreenOption = ConfirmationScreenOption.SHOW_WITH_SERIAL_NUMBER
        )
        mposUi = it
      }

      val parameters = TransactionParameters.Builder()
        .charge(amount, Currency.USD)
        .customIdentifier(reference)
        .build()
      pendingPromise = promise
      pendingReference = reference
      activity.startActivityForResult(
        reader.createTransactionIntent(parameters),
        MposUi.REQUEST_CODE_PAYMENT
      )
    } catch (error: Throwable) {
      pendingPromise = null
      pendingReference = null
      promise.reject("E_TAP_TO_PAY_CONFIG", error.message ?: "Tap to Pay could not start.", error)
    }
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?
  ) {
    if (requestCode != MposUi.REQUEST_CODE_PAYMENT) return
    val promise = pendingPromise ?: return
    pendingPromise = null

    if (resultCode == MposUi.RESULT_CODE_APPROVED) {
      val transactionId = data?.getStringExtra(MposUi.RESULT_EXTRA_TRANSACTION_IDENTIFIER)
      if (transactionId.isNullOrBlank()) {
        promise.reject("E_TAP_TO_PAY_RESULT", "Tap to Pay approved the sale without a transaction identifier.")
      } else {
        promise.resolve(Arguments.createMap().apply {
          putString("transactionId", transactionId)
          putString("provider", "CYBERSOURCE")
          putString("reference", pendingReference)
        })
      }
    } else {
      promise.reject("E_TAP_TO_PAY_FAILED", "Tap to Pay was declined, cancelled, or failed.")
    }
    pendingReference = null
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun requiredString(options: ReadableMap, key: String): String {
    val value = optionalString(options, key)
    require(value.isNotBlank()) { "$key is required for Android Tap to Pay." }
    return value
  }

  private fun optionalString(options: ReadableMap, key: String): String =
    if (options.hasKey(key) && !options.isNull(key)) options.getString(key)?.trim().orEmpty() else ""
}
