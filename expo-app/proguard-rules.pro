# ============================================
# Smart Ride — ProGuard / R8 Rules
# ============================================
# These rules tell R8 not to fail the build when it encounters
# "missing classes" that are referenced by Expo/React Native
# modules but not present on the compile classpath.
#
# Even though we FORCE minifyEnabled false in build.gradle via
# the withAbiSplits config plugin, these rules are here as a
# fallback so the build can NEVER fail with the
# "minifyReleaseWithR8 FAILED" / "Missing class expo.modules.kotlin.types.*"
# error.
# ============================================

# ---- Expo Modules Kotlin (the #1 source of R8 failures) ----
# expo-image-picker references internal expo-modules-kotlin types
# that aren't shipped in the published AAR. R8 sees these as
# "missing classes" and fails the build. Tell it to ignore them.
-dontwarn expo.modules.kotlin.types.AnyTypeCache
-dontwarn expo.modules.kotlin.types.OptimizedRecord
-dontwarn expo.modules.kotlin.types.descriptors.RawTypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorKt
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt
-dontwarn expo.modules.kotlin.types.**

# Keep all expo modules — don't strip any expo-module-kotlin classes
-keep class expo.modules.kotlin.** { *; }
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }

# ---- Mapbox (@rnmapbox/maps) ----
# Mapbox SDK is heavily obfuscated internally; R8 strips too aggressively.
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

# ---- Generic Kotlin metadata — R8 sometimes strips these ----
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# ---- Keep enum values (often referenced by reflection) ----
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ---- Keep native method declarations ----
-keepclasseswithmembernames class * {
    native <methods>;
}
