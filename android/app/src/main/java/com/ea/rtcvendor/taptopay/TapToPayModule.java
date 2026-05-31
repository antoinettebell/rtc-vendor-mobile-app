package com.ea.rtcvendor.taptopay;

import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class TapToPayModule extends ReactContextBaseJavaModule {
  private static final String MODULE_NAME = "TapToPayBridge";
  private static final String MOCK_TOKEN = "MOCK_TOKEN_SUCCESS_SANDBOX_ABELL_DEV";

  public TapToPayModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return MODULE_NAME;
  }

  @ReactMethod
  public void initializeTTP(ReadableMap config, Promise promise) {
    String appleTeamId = null;
    if (config != null && config.hasKey("appleTeamId") && !config.isNull("appleTeamId")) {
      appleTeamId = config.getString("appleTeamId");
    }

    Log.i("TapToPay Android", "ℹ️ [TapToPay Android] Initializing fallback environment...");
    promise.resolve(true);
  }

  @ReactMethod
  public void startPayment(double amount, Promise promise) {
    new Thread(() -> {
      try {
        Thread.sleep(2000);
        promise.resolve(MOCK_TOKEN);
      } catch (InterruptedException error) {
        Thread.currentThread().interrupt();
        promise.reject("E_TAP_TO_PAY_INTERRUPTED", "Tap to Pay fallback payment was interrupted.", error);
      }
    }).start();
  }
}
