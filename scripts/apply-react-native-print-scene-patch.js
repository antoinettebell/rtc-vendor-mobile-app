"use strict";

const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-print",
  "ios",
  "RNPrint",
  "RNPrint.m",
);

if (!fs.existsSync(target)) {
  throw new Error(`react-native-print source was not found at ${target}`);
}

let source = fs.readFileSync(target, "utf8");
const scenePresenter = "UIViewController *presentingController = RCTPresentedViewController();";

if (!source.includes(scenePresenter)) {
  const legacyView =
    "        UIView *view = [[UIApplication sharedApplication] keyWindow].rootViewController.view;";
  const printView = [
    "        UIViewController *presentingController = RCTPresentedViewController();",
    "        UIView *view = presentingController.view;",
    "        if (view == nil) {",
    "            reject(RCTErrorUnspecified, nil, RCTErrorWithMessage(@\"Unable to find the active app window for printing\"));",
    "            return;",
    "        }",
  ].join("\n");
  const printerView = [
    "        UIViewController *presentingController = RCTPresentedViewController();",
    "        UIView *view = presentingController.view;",
    "        if (view == nil) {",
    "            reject(RCTErrorUnspecified, nil, RCTErrorWithMessage(@\"Unable to find the active app window for printer selection\"));",
    "            return;",
    "        }",
  ].join("\n");

  if (!source.includes(legacyView)) {
    throw new Error("react-native-print does not match the expected 0.11.0 iPad presenter code.");
  }
  source = source.replace(legacyView, printView);

  if (!source.includes(legacyView)) {
    throw new Error("react-native-print is missing the expected printer-selection presenter code.");
  }
  source = source.replace(legacyView, printerView);

  const legacyParent = [
    "    UIViewController *result = [[[[UIApplication sharedApplication] delegate] window] rootViewController];",
    "    while (result.presentedViewController) {",
    "        result = result.presentedViewController;",
    "    }",
    "    return result;",
  ].join("\n");
  if (!source.includes(legacyParent)) {
    throw new Error("react-native-print is missing the expected print parent view controller code.");
  }
  source = source.replace(legacyParent, "    return RCTPresentedViewController();");

  fs.writeFileSync(target, source);
  console.log("Applied scene-safe react-native-print iPad presenter patch.");
} else {
  console.log("Scene-safe react-native-print iPad presenter patch already applied.");
}
