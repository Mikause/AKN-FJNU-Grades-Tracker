package com.mikause.gradeviewer

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

class StorageManager(private val context: Context) {

    private val authPrefs: SharedPreferences by lazy {
        try {
            val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
            EncryptedSharedPreferences.create(
                "auth_credentials_secure",
                masterKeyAlias,
                context,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            context.getSharedPreferences("auth_credentials_fallback", Context.MODE_PRIVATE)
        }
    }

    private val generalPrefs: SharedPreferences by lazy {
        context.getSharedPreferences("app_settings", Context.MODE_PRIVATE)
    }

    private val musicDir: File by lazy {
        File(context.filesDir, "music").apply { if (!exists()) mkdirs() }
    }

    private val customBackgroundFile: File by lazy {
        File(context.filesDir, "custom_background.jpg")
    }

    private val customBackgroundVideoFile: File by lazy {
        File(context.filesDir, "custom_background_video.bin")
    }

    private val customBackgroundVideoTypeFile: File by lazy {
        File(context.filesDir, "custom_background_video_type.txt")
    }

    // --- Credentials ---
    fun saveCredentials(username: String, password: String) {
        authPrefs.edit()
            .putString("username", username)
            .putString("password", password)
            .putBoolean("remember", true)
            .apply()
    }

    fun loadCredentials(): String {
        val username = authPrefs.getString("username", "") ?: ""
        val password = authPrefs.getString("password", "") ?: ""
        val remember = authPrefs.getBoolean("remember", false)

        val json = JSONObject()
        json.put("username", username)
        json.put("password", password)
        json.put("remember", remember)
        return json.toString()
    }

    fun clearCredentials() {
        authPrefs.edit().clear().apply()
    }

    // --- UI Settings ---
    fun getUiSettings(): String {
        val saved = generalPrefs.getString("ui_settings", null)
        if (!saved.isNullOrEmpty()) {
            return saved
        }
        val defaultSettings = JSONObject().apply {
            put("accent_color", "#087f8c")
            put("glass_blur", 22)
            put("glass_opacity", 0.42)
            put("bg_dim", 0.15)
            put("show_player", true)
        }
        return defaultSettings.toString()
    }

    fun saveUiSettings(jsonStr: String): String {
        try {
            val obj = JSONObject(jsonStr)
            val normalized = JSONObject().apply {
                var accent = obj.optString("accent_color", "#087f8c").trim()
                if (!accent.matches(Regex("^#[0-9a-fA-F]{6}$"))) {
                    accent = "#087f8c"
                }
                put("accent_color", accent)
                put("glass_blur", obj.optInt("glass_blur", 22).coerceIn(0, 40))
                put("glass_opacity", obj.optDouble("glass_opacity", 0.42).coerceIn(0.15, 0.85))
                put("bg_dim", obj.optDouble("bg_dim", 0.15).coerceIn(0.0, 0.75))
                put("show_player", obj.optBoolean("show_player", true))
            }
            val result = normalized.toString()
            generalPrefs.edit().putString("ui_settings", result).apply()
            return result
        } catch (e: Exception) {
            return getUiSettings()
        }
    }

    fun resetUiSettings(): String {
        generalPrefs.edit().remove("ui_settings").apply()
        return getUiSettings()
    }

    // --- Player State ---
    fun getPlayerState(): String {
        val saved = generalPrefs.getString("player_state", null)
        if (!saved.isNullOrEmpty()) {
            return saved
        }
        val defaultState = JSONObject().apply {
            put("track_id", "default")
            put("time", 0.0)
            put("duration", 0.0)
            put("volume", 0.7)
            put("muted", false)
            put("playing", true)
            put("shuffle", false)
        }
        return defaultState.toString()
    }

    fun savePlayerState(jsonStr: String) {
        try {
            generalPrefs.edit().putString("player_state", jsonStr).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // --- Backgrounds ---
    fun saveBackground(dataUrl: String): Boolean {
        return try {
            if (dataUrl.startsWith("data:video/")) {
                val parts = dataUrl.split(",", limit = 2)
                val header = parts[0]
                val base64Data = parts[1]
                val mimeType = header.removePrefix("data:").split(";")[0]
                val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                FileOutputStream(customBackgroundVideoFile).use { it.write(bytes) }
                customBackgroundVideoTypeFile.writeText(mimeType)
                if (customBackgroundFile.exists()) customBackgroundFile.delete()
            } else if (dataUrl.startsWith("data:image/")) {
                val parts = dataUrl.split(",", limit = 2)
                val base64Data = parts[1]
                val bytes = Base64.decode(base64Data, Base64.DEFAULT)
                FileOutputStream(customBackgroundFile).use { it.write(bytes) }
                if (customBackgroundVideoFile.exists()) customBackgroundVideoFile.delete()
                if (customBackgroundVideoTypeFile.exists()) customBackgroundVideoTypeFile.delete()
            }
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    fun resetBackground(): String {
        try {
            if (customBackgroundFile.exists()) customBackgroundFile.delete()
            if (customBackgroundVideoFile.exists()) customBackgroundVideoFile.delete()
            if (customBackgroundVideoTypeFile.exists()) customBackgroundVideoTypeFile.delete()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return getBackgroundImageUri()
    }

    fun getBackgroundVideo(): String {
        if (!customBackgroundVideoFile.exists()) return ""
        return try {
            val mimeType = if (customBackgroundVideoTypeFile.exists()) {
                customBackgroundVideoTypeFile.readText().trim()
            } else {
                "video/mp4"
            }
            val bytes = customBackgroundVideoFile.readBytes()
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            "data:$mimeType;base64,$base64"
        } catch (e: Exception) {
            ""
        }
    }

    fun getBackgroundImageUri(): String {
        return try {
            if (customBackgroundFile.exists()) {
                val bytes = customBackgroundFile.readBytes()
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                "data:image/jpeg;base64,$base64"
            } else {
                context.assets.open("login-background.webp").use { input ->
                    val bytes = input.readBytes()
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    "data:image/webp;base64,$base64"
                }
            }
        } catch (e: Exception) {
            ""
        }
    }

    fun getLogoUri(): String {
        return try {
            context.assets.open("fjnu-logo.jpg").use { input ->
                val bytes = input.readBytes()
                val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                "data:image/jpeg;base64,$base64"
            }
        } catch (e: Exception) {
            ""
        }
    }

    // --- Music Tracks ---
    fun getMusicTracks(): String {
        val array = JSONArray()
        val defaultTrack = JSONObject().apply {
            put("id", "default")
            put("name", "秋绪 (默认)")
        }
        array.put(defaultTrack)

        val mp3Files = musicDir.listFiles { file -> file.extension.equals("mp3", ignoreCase = true) }
        mp3Files?.sortedBy { it.name.lowercase() }?.forEach { file ->
            val track = JSONObject().apply {
                put("id", file.name)
                put("name", file.nameWithoutExtension)
            }
            array.put(track)
        }
        return array.toString()
    }

    fun saveMusicTrack(name: String, dataUrl: String): String {
        try {
            val parts = dataUrl.split(",", limit = 2)
            val bytes = Base64.decode(parts[1], Base64.DEFAULT)
            val cleanName = name.replace(Regex("[^a-zA-Z0-9_\\-\u4e00-\u9fa5]"), "_").take(60)
            val file = File(musicDir, "$cleanName.mp3")
            FileOutputStream(file).use { it.write(bytes) }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return getMusicTracks()
    }

    fun getMusicFile(trackId: String): File? {
        if (trackId == "default") return null
        val file = File(musicDir, trackId)
        return if (file.exists()) file else null
    }
}
