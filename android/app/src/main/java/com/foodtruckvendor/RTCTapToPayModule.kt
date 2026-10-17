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
import com.facebook.react.bridge.UiThreadUtil
import io.mpos.accessories.AccessoryFamily
import io.mpos.accessories.parameters.AccessoryParameters
import io.mpos.paybutton.ConfirmationScreenOption
import io.mpos.paybutton.MposUi
import io.mpos.paybutton.SerialNumberInputMethod
import io.mpos.paybutton.TapToPhoneConfiguration
import io.mpos.paybutton.UiConfiguration
import io.mpos.provider.ProviderMode
import io.mpos.taptophone.EnrollResultIntent
import io.mpos.transactions.Currency
import io.mpos.transactions.parameters.TransactionParameters
import java.math.BigDecimal
import java.util.Locale

/**
 * Native CyberSource Tap to Pay bridge.
 *
 * The Acceptance Devices merchant credentials are injected by Gradle from the
 * ignored native TapToPay.local.properties file (or secure build variables).
 * They must never cross the React Native bridge.
 */
class RTCTapToPayModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
  private enum class PendingOperation { ACTIVATION, SALE }

  private var mposUi: MposUi? = null
  private var readerEnvironment: ProviderMode? = null
  private var pendingPromise: Promise? = null
  private var pendingOperation: PendingOperation? = null
  private var pendingReference: String? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "RTCTapToPay"

  @ReactMethod
  fun getActivationStatus(options: ReadableMap, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        requireSupportedAndroidVersion()
        val environment = environmentFor(options)
        val reader = readerFor(environment)
        val deviceId = enrolledSerial(reader)
        promise.resolve(Arguments.createMap().apply {
          putBoolean("activated", !deviceId.isNullOrBlank())
          putString("environment", environmentName(environment))
          if (!deviceId.isNullOrBlank()) putString("deviceId", deviceId)
        })
      } catch (_: Throwable) {
        promise.reject(
          "E_TAP_TO_PAY_CONFIG",
          "Android Tap to Pay is missing valid native CyberSource configuration."
        )
      }
    }
  }

  @ReactMethod
  fun prepare(options: ReadableMap, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        requireSupportedAndroidVersion()
        val environment = environmentFor(options)
        val reader = readerFor(environment)
        val deviceId = enrolledSerial(reader)
        promise.resolve(Arguments.createMap().apply {
          putBoolean("prepared", !deviceId.isNullOrBlank())
          putBoolean("activated", !deviceId.isNullOrBlank())
          putString("environment", environmentName(environment))
        })
      } catch (_: Throwable) {
        promise.reject(
          "E_TAP_TO_PAY_CONFIG",
          "Android Tap to Pay could not prepare its native reader."
        )
      }
    }
  }

  @ReactMethod
  fun activate(options: ReadableMap, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (!requireSupportedAndroidVersion(promise) || !beginOperation(PendingOperation.ACTIVATION, promise)) {
        return@runOnUiThread
      }

      try {
        val environment = environmentFor(options)
        val reader = readerFor(environment)
        val existingDeviceId = optionalString(options, "existingDeviceId")
        val forceReactivation = optionalBoolean(options, "forceReactivation")
        val enrolledDeviceId = enrolledSerial(reader)
        if (!forceReactivation && !enrolledDeviceId.isNullOrBlank()) {
          resolveActivation(enrolledDeviceId, false)
          return@runOnUiThread
        }

        val activity = currentActivityOrReject()
        if (activity == null) return@runOnUiThread
        if (forceReactivation && existingDeviceId.isNotBlank()) {
          reader.tapToPhone.reEnrollDevice(activity, existingDeviceId, REQUEST_CODE_ACTIVATION)
        } else {
          reader.tapToPhone.enrollDevice(activity, REQUEST_CODE_ACTIVATION)
        }
      } catch (_: Throwable) {
        rejectAndClear(
          "E_TAP_TO_PAY_ACTIVATION_FAILED",
          "Android Tap to Pay activation could not start. Confirm this is a supported physical device and try again."
        )
      }
    }
  }

  @ReactMethod
  fun startSale(options: ReadableMap, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (!requireSupportedAndroidVersion(promise) || !beginOperation(PendingOperation.SALE, promise)) {
        return@runOnUiThread
      }

      try {
        val amount = BigDecimal(requiredString(options, "amount"))
        require(amount > BigDecimal.ZERO) { "Transaction amount must be greater than zero." }
        val environment = environmentFor(options)
        val reader = readerFor(environment)
        val deviceId = enrolledSerial(reader)
        if (deviceId.isNullOrBlank()) {
          rejectAndClear(
            "E_TAP_TO_PAY_NOT_ACTIVATED",
            "Android Tap to Pay must be activated before accepting a payment."
          )
          return@runOnUiThread
        }
        val reference = optionalString(options, "orderNumber")
          .ifBlank { optionalString(options, "orderId") }
          .ifBlank { "rtc-${System.currentTimeMillis()}" }
        val currency = Currency.valueOf(optionalString(options, "currency").ifBlank { "USD" }.uppercase(Locale.US))
        val activity = currentActivityOrReject()
        if (activity == null) return@runOnUiThread

        val parameters = TransactionParameters.Builder()
          .charge(amount, currency)
          .customIdentifier(reference)
          .build()
        pendingReference = reference
        activity.startActivityForResult(
          reader.createTransactionIntent(parameters),
          MposUi.REQUEST_CODE_PAYMENT
        )
      } catch (_: Throwable) {
        rejectAndClear("E_TAP_TO_PAY_CONFIG", "Android Tap to Pay could not start this payment.")
      }
    }
  }

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?
  ) {
    when (requestCode) {
      REQUEST_CODE_ACTIVATION -> handleActivationResult(resultCode, data)
      MposUi.REQUEST_CODE_PAYMENT -> handlePaymentResult(resultCode, data)
    }
  }

  override fun onNewIntent(intent: Intent) = Unit

  private fun handleActivationResult(resultCode: Int, data: Intent?) {
    if (pendingOperation != PendingOperation.ACTIVATION) return
    val reader = mposUi
    val serial = data?.getStringExtra(EnrollResultIntent.ENROLLMENT_RESULT_EXTRA_SERIAL_NUMBER)
      ?.trim()
      ?.takeIf { it.isNotEmpty() }
      ?: reader?.let(::enrolledSerial)
    val enrolled = data?.getBooleanExtra(EnrollResultIntent.ENROLLMENT_RESULT_EXTRA_ENROLLED, false) == true
      || !serial.isNullOrBlank()
    if (enrolled && !serial.isNullOrBlank()) {
      resolveActivation(serial, true)
    } else {
      rejectAndClear(
        "E_TAP_TO_PAY_ACTIVATION_FAILED",
        if (resultCode == Activity.RESULT_CANCELED) {
          "Android Tap to Pay activation was cancelled."
        } else {
          "Android Tap to Pay activation did not complete."
        }
      )
    }
  }

  private fun handlePaymentResult(resultCode: Int, data: Intent?) {
    if (pendingOperation != PendingOperation.SALE) return
    val promise = pendingPromise ?: return
    if (resultCode != MposUi.RESULT_CODE_APPROVED) {
      rejectAndClear("E_TAP_TO_PAY_FAILED", "Android Tap to Pay was declined, cancelled, or failed.")
      return
    }

    // CyberSource exposes the processor identifier in processing details when
    // available. Keep the SDK transaction identifier as a partner reference.
    val sdkTransactionId = data?.getStringExtra(MposUi.RESULT_EXTRA_TRANSACTION_IDENTIFIER)
      ?.trim()
      ?.takeIf { it.isNotEmpty() }
    val processorRequestId = mposUi?.latestTransaction?.processingDetails?.identifier
      ?.trim()
      ?.takeIf { it.isNotEmpty() }
    val transactionId = processorRequestId ?: sdkTransactionId
    if (transactionId.isNullOrBlank()) {
      rejectAndClear(
        "E_TAP_TO_PAY_RESULT",
        "Payment approval did not include a usable CyberSource transaction identifier. Do not charge the customer again."
      )
      return
    }

    val deviceId = mposUi?.let(::enrolledSerial)
    val reference = pendingReference
    clearPending()
    promise.resolve(Arguments.createMap().apply {
      putString("transactionId", transactionId)
      if (!sdkTransactionId.isNullOrBlank() && sdkTransactionId != transactionId) {
        putString("partnerTransactionId", sdkTransactionId)
      }
      putString("provider", "CYBERSOURCE")
      putString("environment", readerEnvironment?.let(::environmentName))
      putString("reference", reference)
      if (!deviceId.isNullOrBlank()) putString("deviceId", deviceId)
    })
  }

  private fun readerFor(environment: ProviderMode): MposUi {
    if (mposUi != null && readerEnvironment == environment) return checkNotNull(mposUi)
    val merchantId = requiredNativeConfig(BuildConfig.CYBERSOURCE_TTP_MERCHANT_ID)
    val merchantSecret = requiredNativeConfig(BuildConfig.CYBERSOURCE_TTP_ACCEPTANCE_DEVICE_SECRET)
    return MposUi.create(
      providerMode = environment,
      merchantId = merchantId,
      merchantSecret = merchantSecret,
      terminalParameters = AccessoryParameters.Builder(AccessoryFamily.TAP_TO_PHONE)
        .integrated()
        .build()
    ).also { reader ->
      reader.configuration = UiConfiguration.Builder().build()
      reader.tapToPhone.tapToPhoneConfiguration = TapToPhoneConfiguration(
        serialNumberInputMethod = SerialNumberInputMethod.DEVICE_LIST,
        confirmationScreenOption = ConfirmationScreenOption.SHOW_WITH_SERIAL_NUMBER
      )
      mposUi = reader
      readerEnvironment = environment
    }
  }

  private fun enrolledSerial(reader: MposUi): String? {
    if (!reader.tapToPhone.isDeviceEnrolled()) return null
    return reader.tapToPhone.getMerchantInformation()?.enrolledSerialNumber
      ?.trim()
      ?.takeIf { it.isNotEmpty() }
  }

  private fun environmentFor(options: ReadableMap): ProviderMode =
    if (optionalString(options, "environment").lowercase(Locale.US) in setOf("sandbox", "test", "testing")) {
      ProviderMode.TEST
    } else {
      ProviderMode.LIVE
    }

  private fun environmentName(environment: ProviderMode): String =
    if (environment == ProviderMode.TEST) "test" else "production"

  private fun requireSupportedAndroidVersion() {
    require(Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      "Tap to Pay requires Android 12 or later."
    }
  }

  private fun requireSupportedAndroidVersion(promise: Promise): Boolean = try {
    requireSupportedAndroidVersion()
    true
  } catch (_: Throwable) {
    promise.reject("E_TAP_TO_PAY_ANDROID_VERSION", "Tap to Pay requires Android 12 or later.")
    false
  }

  private fun requiredNativeConfig(value: String): String {
    val normalized = value.trim()
    require(normalized.isNotEmpty() && !normalized.startsWith("REPLACE_WITH")) {
      "Native CyberSource Tap to Pay configuration is required."
    }
    return normalized
  }

  private fun beginOperation(operation: PendingOperation, promise: Promise): Boolean {
    if (pendingPromise != null) {
      promise.reject("E_TAP_TO_PAY_BUSY", "Another Tap to Pay operation is already active.")
      return false
    }
    pendingPromise = promise
    pendingOperation = operation
    pendingReference = null
    return true
  }

  private fun currentActivityOrReject(): Activity? {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      rejectAndClear("E_TAP_TO_PAY_ACTIVITY", "Tap to Pay requires an active Android screen.")
    }
    return activity
  }

  private fun resolveActivation(deviceId: String, newDevice: Boolean) {
    val promise = pendingPromise ?: return
    clearPending()
    promise.resolve(Arguments.createMap().apply {
      putBoolean("activated", true)
      putBoolean("newDevice", newDevice)
      putString("deviceId", deviceId)
      putString("environment", readerEnvironment?.let(::environmentName))
    })
  }

  private fun rejectAndClear(code: String, message: String) {
    val promise = pendingPromise
    clearPending()
    promise?.reject(code, message)
  }

  private fun clearPending() {
    pendingPromise = null
    pendingOperation = null
    pendingReference = null
  }

  private fun requiredString(options: ReadableMap, key: String): String {
    val value = optionalString(options, key)
    require(value.isNotBlank()) { "$key is required for Android Tap to Pay." }
    return value
  }

  private fun optionalString(options: ReadableMap, key: String): String =
    if (options.hasKey(key) && !options.isNull(key)) options.getString(key)?.trim().orEmpty() else ""

  private fun optionalBoolean(options: ReadableMap, key: String): Boolean =
    options.hasKey(key) && !options.isNull(key) && options.getBoolean(key)

  private companion object {
    const val REQUEST_CODE_ACTIVATION = 40_821
  }
}
