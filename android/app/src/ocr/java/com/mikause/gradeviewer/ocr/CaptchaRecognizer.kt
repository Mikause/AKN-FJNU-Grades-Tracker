package com.mikause.gradeviewer.ocr

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import org.json.JSONArray
import java.nio.FloatBuffer

class CaptchaRecognizer private constructor(private val context: Context) {

    private var ortEnv: OrtEnvironment? = null
    private var ortSession: OrtSession? = null
    private var charset: List<String> = emptyList()
    private var inputName: String = "input1"
    private var isInitialized = false

    companion object {
        @Volatile
        private var instance: CaptchaRecognizer? = null

        fun getInstance(context: Context): CaptchaRecognizer {
            return instance ?: synchronized(this) {
                instance ?: CaptchaRecognizer(context.applicationContext).also { instance = it }
            }
        }
    }

    @Synchronized
    fun initialize(): Boolean {
        if (isInitialized) return true
        return try {
            ortEnv = OrtEnvironment.getEnvironment()
            val modelBytes = context.assets.open("common.onnx").use { it.readBytes() }
            val charsetJsonStr = context.assets.open("charset.json").use { it.reader().readText() }

            val jsonArray = JSONArray(charsetJsonStr)
            val list = ArrayList<String>(jsonArray.length())
            for (i in 0 until jsonArray.length()) {
                list.add(jsonArray.optString(i, ""))
            }
            charset = list

            val options = OrtSession.SessionOptions().apply {
                setIntraOpNumThreads(2)
            }
            ortSession = ortEnv?.createSession(modelBytes, options)
            inputName = ortSession?.inputNames?.firstOrNull() ?: "input1"

            isInitialized = true
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    fun recognizeBase64(base64Data: String): String {
        return try {
            val cleanBase64 = if (base64Data.contains(",")) {
                base64Data.substringAfter(",")
            } else {
                base64Data
            }
            val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size) ?: return ""
            recognizeBitmap(bitmap)
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        }
    }

    fun recognizeBitmap(bitmap: Bitmap): String {
        if (!initialize()) return ""
        val env = ortEnv ?: return ""
        val session = ortSession ?: return ""

        var inputTensor: OnnxTensor? = null
        var results: OrtSession.Result? = null

        return try {
            val targetHeight = 64
            val targetWidth = ((bitmap.width.toFloat() * 64f) / bitmap.height.toFloat()).toInt().coerceAtLeast(16)
            val scaled = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)

            val buffer = FloatBuffer.allocate(1 * 1 * targetHeight * targetWidth)
            for (y in 0 until targetHeight) {
                for (x in 0 until targetWidth) {
                    val pixel = scaled.getPixel(x, y)
                    val r = (pixel shr 16) and 0xff
                    val g = (pixel shr 8) and 0xff
                    val b = pixel and 0xff
                    val gray = 0.299f * r + 0.587f * g + 0.114f * b
                    val norm = (gray / 255.0f - 0.5f) / 0.5f
                    buffer.put(norm)
                }
            }
            buffer.rewind()

            val tensorShape = longArrayOf(1, 1, targetHeight.toLong(), targetWidth.toLong())
            inputTensor = OnnxTensor.createTensor(env, buffer, tensorShape)
            results = session.run(mapOf(inputName to inputTensor))

            val rawOutput = results[0].value
            val tokens = when (rawOutput) {
                is Array<*> -> (rawOutput[0] as? LongArray) ?: longArrayOf()
                is LongArray -> rawOutput
                else -> longArrayOf()
            }

            val sb = StringBuilder()
            var lastToken = 0L
            for (token in tokens) {
                if (token != lastToken) {
                    lastToken = token
                    if (token != 0L && token < charset.size) {
                        sb.append(charset[token.toInt()])
                    }
                }
            }
            sb.toString()
        } catch (e: Exception) {
            e.printStackTrace()
            ""
        } finally {
            try {
                inputTensor?.close()
                results?.close()
            } catch (e: Exception) {
            }
        }
    }

    fun release() {
        try {
            ortSession?.close()
            ortEnv?.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        ortSession = null
        ortEnv = null
        isInitialized = false
    }
}
