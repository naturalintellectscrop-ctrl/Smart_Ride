# ============================================
# Smart Ride — ProGuard / R8 Rules (reference copy)
# ============================================
# The ACTUAL rules used at build time are auto-generated
# by plugins/withProguardRules.js into android/app/proguard-rules.pro
# during `npx expo prebuild`.
#
# This root-level file is kept for reference and for any
# manual Gradle builds that reference it directly.
# ============================================

# ---- Expo Modules Kotlin (the #1 source of R8 failures) ----
-dontwarn expo.modules.kotlin.types.AnyTypeCache
-dontwarn expo.modules.kotlin.types.OptimizedRecord
-dontwarn expo.modules.kotlin.types.descriptors.RawTypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorKt
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt
-dontwarn expo.modules.kotlin.types.**

-keep class expo.modules.kotlin.** { *; }
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }

# ---- Mapbox (@rnmapbox/maps) ----
-keep class com.mapbox.** { *; }
-keep class com.rnmapbox.rnmbx.** { *; }
-dontwarn com.mapbox.**
-dontwarn com.rnmapbox.rnmbx.**

# ---- React Native core ----
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.swmansion.** { *; }
-dontwarn com.facebook.react.**

# ---- Google Sign-In ----
-keep class com.reactnativegooglesignin.** { *; }
-dontwarn com.reactnativegooglesignin.**

# ---- Google Play Services / Firebase ----
-keep class com.google.android.gms.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.google.android.gms.**
-dontwarn com.google.firebase.**

# ---- Agora (in-app calling) ----
-keep class io.agora.** { *; }
-dontwarn io.agora.**

# ---- Sentry ----
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ---- React Native Reanimated / Worklets ----
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.reanimated.**
-dontwarn com.swmansion.worklets.**

# ---- Generic Kotlin metadata ----
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# ---- Keep enum values ----
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ---- Keep native method declarations ----
-keepclasseswithmembernames class * {
    native <methods>;
}
