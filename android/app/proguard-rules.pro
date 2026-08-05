# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Tap to Pay SDKs use native callbacks and serialized transaction models.
-keep class com.cybersource.** { *; }
-keep class net.authorize.** { *; }
# Visa Acceptance Devices / Tap to Pay on Android
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn com.squareup.okhttp.**
-keep class com.squareup.okhttp.* { *; }
-dontwarn okio.**
-keep class io.mpos.** { *; }
-dontwarn io.mpos.**
-keep class com.visa.vac.tc.** { *; }
-keep class com.nimbusds.jose.** { *; }
-keep class org.bouncycastle.** { *; }
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-keep class com.visa.auth.** { *; }
-dontwarn com.visa.auth.**
-keep class androidx.** { *; }
-keep class com.visa.SensoryBrandingView
-keep class com.mastercard.sonic.BuildConfig { *; }
