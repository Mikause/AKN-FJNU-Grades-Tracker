plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.mikause.gradeviewer"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.mikause.gradeviewer"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "1.2.0"
    }

    flavorDimensions += "version"
    productFlavors {
        create("standard") {
            dimension = "version"
        }
        create("ocr") {
            dimension = "version"
        }
    }

    sourceSets {
        getByName("ocr") {
            assets.srcDirs("src/ocr/assets", "../../assets/ocr")
        }
    }

    androidResources {
        noCompress += listOf("mp3", "onnx")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    "ocrImplementation"("com.microsoft.onnxruntime:onnxruntime-android:1.17.1")
}
