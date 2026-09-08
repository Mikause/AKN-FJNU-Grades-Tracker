-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.mikause.gradeviewer.WebAppInterface { *; }
-keep class ai.onnxruntime.** { *; }
-keepattributes *Annotation*

