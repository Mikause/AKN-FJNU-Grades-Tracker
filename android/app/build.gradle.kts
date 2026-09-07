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
        versionCode = 1
        versionName = "1.1.0"
    }

    androidResources {
        noCompress += "mp3"
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
}
