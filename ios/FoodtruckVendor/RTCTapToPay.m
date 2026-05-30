#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RTCTapToPay, NSObject)

RCT_EXTERN_METHOD(startSale:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
