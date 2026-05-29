#import <React/RCTBridgeModule.h>

@interface RTCTapToPay : NSObject <RCTBridgeModule>
@end

@implementation RTCTapToPay

RCT_EXPORT_MODULE(RTCTapToPay)

RCT_EXPORT_METHOD(startSale:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *provider = [options[@"provider"] isKindOfClass:[NSString class]]
                           ? options[@"provider"]
                           : @"UNKNOWN";
  NSString *environment = [options[@"environment"] isKindOfClass:[NSString class]]
                              ? options[@"environment"]
                              : @"UNKNOWN";

  reject(
      @"E_TAP_TO_PAY_NOT_CONFIGURED",
      @"Tap to Pay native SDK is not configured. Install the Authorize.net/Cybersource Tap to Pay on iPhone SDK bridge and map its sale result to RTCTapToPay.startSale.",
      [NSError errorWithDomain:@"RTCTapToPay"
                          code:1
                      userInfo:@{
                        @"provider" : provider,
                        @"environment" : environment,
                      }]);
}

@end
