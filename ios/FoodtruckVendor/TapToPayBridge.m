#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TapToPayBridge, NSObject)

RCT_EXTERN_METHOD(initializeTTP:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startPayment:(double)amount
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
