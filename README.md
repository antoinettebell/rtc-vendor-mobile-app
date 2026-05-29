This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Vendor POS Tap to Pay

The vendor POS checkout uses the existing backend `/order/payment-checkout` flow for card-present Tap to Pay transactions. With Tap to Pay approval in place, production builds should set `TAP_TO_PAY_ENABLED=true` and use the production gateway environment.

Required environment values are documented in `.env.example`:

```sh
APPLE_PAY_MERCHANT_ID=merchant.roundthecorner.vendor
ANDROID_PAYMENT_GATEWAY=authorizenet
ANDROID_PAYMENT_GATEWAY_MERCHANT_ID=2794197
TAP_TO_PAY_ENABLED=true
TAP_TO_PAY_PROVIDER=AUTHORIZE_NET
TAP_TO_PAY_ENVIRONMENT=production
TAP_TO_PAY_MERCHANT_ID=
TAP_TO_PAY_TERMINAL_ID=
TAP_TO_PAY_SDK_CONFIG_ID=
TAP_TO_PAY_CURRENCY=USD
```

`TAP_TO_PAY_MERCHANT_ID` and `TAP_TO_PAY_TERMINAL_ID` are optional overrides. When blank, Tap to Pay uses the same Apple Pay merchant id, Android gateway merchant id, and backend Authorize.Net credentials as the normal wallet payment flow.

Android requires an NFC-capable supported device and the Authorize.net/Cybersource Tap to Pay SDK bridge to resolve `RTCTapToPay.startSale`. iOS production builds require the Apple Tap to Pay entitlement in the provisioning profile and `com.apple.developer.proximity-reader.payment.acceptance` in the app entitlements.

React Native calls `NativeModules.RTCTapToPay.startSale(options)` from `src/services/tapToPay-service.js`. The payload includes `amount`, `currency`, `orderNumber`, `orderId`, `platform`, `provider`, `environment`, `merchantId`, `terminalId`, and `sdkConfigId`. A provider SDK implementation must resolve with either `opaqueToken` / `opaqueData` containing `dataValue` and optional `dataDescriptor`, or a processed transaction result containing `transactionId` / `transId`. Until the Authorize.net/Cybersource Tap to Pay on iPhone SDK is installed and mapped, the native bridge rejects with `E_TAP_TO_PAY_NOT_CONFIGURED`.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
