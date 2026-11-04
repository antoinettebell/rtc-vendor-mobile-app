import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleMaps
import Firebase
import FirebaseMessaging

@main
class AppDelegate: RCTAppDelegate {
  override init() {
    super.init()
    // iOS 27 requires UIKit scenes. The SceneDelegate creates the React Native
    // window for the app's single supported scene instead of RCTAppDelegate
    // creating a legacy application-owned window during launch.
    automaticallyLoadReactNativeWindow = false
  }

  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    GMSServices.provideAPIKey("AIzaSyAlopZi4IG0IPl083xL20FGxlZZ_m8lslc")
    
    FirebaseApp.configure()
    
    self.moduleName = "FoodtruckVendor"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]

    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    // Register with APNs explicitly so Firebase Messaging receives Apple's
    // device token before JavaScript requests an FCM token.
    application.registerForRemoteNotifications()

    return result
  }

  func startReactNative(in window: UIWindow, launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) {
    reactNativeFactory.startReactNative(
      withModuleName: moduleName ?? "FoodtruckVendor",
      in: window,
      initialProperties: initialProps,
      launchOptions: launchOptions
    )
  }

  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    RCTLinkingManager.application(app, open: url, options: options)
  }

  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    NSLog("APNs registration failed: %@", error.localizedDescription)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

/// Owns the app's one UIKit scene. Supporting one scene keeps the existing
/// single-window vendor workflow while satisfying the iOS 27 scene lifecycle.
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }

    let sceneWindow = UIWindow(windowScene: windowScene)
    window = sceneWindow
    // Keep a compatibility reference for native dependencies that still read
    // UIApplication.delegate.window. UIKit scene ownership remains here.
    appDelegate.window = sceneWindow
    appDelegate.startReactNative(
      in: sceneWindow,
      launchOptions: launchOptions(for: connectionOptions)
    )

  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: openURLOptions(for: context.options)
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  private func launchOptions(
    for connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    guard let context = connectionOptions.urlContexts.first else { return nil }

    var options: [UIApplication.LaunchOptionsKey: Any] = [.url: context.url]
    if let sourceApplication = context.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = context.options.annotation {
      options[.annotation] = annotation
    }
    return options
  }

  private func openURLOptions(
    for options: UIScene.OpenURLOptions
  ) -> [UIApplication.OpenURLOptionsKey: Any] {
    var applicationOptions: [UIApplication.OpenURLOptionsKey: Any] = [
      .openInPlace: options.openInPlace
    ]

    if let sourceApplication = options.sourceApplication {
      applicationOptions[.sourceApplication] = sourceApplication
    }
    if let annotation = options.annotation {
      applicationOptions[.annotation] = annotation
    }

    return applicationOptions
  }
}
