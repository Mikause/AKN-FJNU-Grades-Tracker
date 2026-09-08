package com.mikause.gradeviewer.ocr

import android.content.Context

class CaptchaRecognizer private constructor() {

    companion object {
        @Volatile
        private var instance: CaptchaRecognizer? = null

        fun getInstance(context: Context): CaptchaRecognizer {
            return instance ?: synchronized(this) {
                instance ?: CaptchaRecognizer().also { instance = it }
            }
        }
    }

    fun recognizeBase64(base64Data: String): String = ""
}
