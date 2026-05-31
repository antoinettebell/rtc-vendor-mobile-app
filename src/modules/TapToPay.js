import { NativeModules, Platform } from 'react-native';

const { TapToPayBridge } = NativeModules;

const getTapToPayBridge = () => {
  if (Platform.OS === 'ios') {
    return TapToPayBridge;
  }

  if (Platform.OS === 'android') {
    return TapToPayBridge;
  }

  return null;
};

const TapToPay = {
  async initializeTapToPay(config = {}) {
    const bridge = getTapToPayBridge();

    if (!bridge) {
      throw new Error(`Tap to Pay is not supported on ${Platform.OS}.`);
    }

    return bridge.initializeTTP(config);
  },

  async executeTapToPay(amount) {
    const bridge = getTapToPayBridge();

    if (!bridge) {
      throw new Error(`Tap to Pay is not supported on ${Platform.OS}.`);
    }

    return bridge.startPayment(amount);
  },
};

export default TapToPay;
