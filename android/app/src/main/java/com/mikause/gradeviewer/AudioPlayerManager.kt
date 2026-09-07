package com.mikause.gradeviewer

import android.content.Context
import android.media.MediaPlayer
import org.json.JSONObject
import java.io.File

class AudioPlayerManager(
    private val context: Context,
    private val storageManager: StorageManager
) {
    private var mediaPlayer: MediaPlayer? = null

    private var currentTrackId = "default"
    private var volume = 0.7f
    private var isMuted = false
    private var isShuffle = false
    private var cachedDurationMs = 0
    private var shouldPlayOnStart = true

    init {
        restoreState()
        initPlayer(currentTrackId, autoPlay = false)
    }

    private fun restoreState() {
        try {
            val json = JSONObject(storageManager.getPlayerState())
            currentTrackId = json.optString("track_id", "default")
            volume = json.optDouble("volume", 0.7).toFloat().coerceIn(0f, 1f)
            isMuted = json.optBoolean("muted", false)
            isShuffle = json.optBoolean("shuffle", false)
            shouldPlayOnStart = json.optBoolean("playing", true)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun shouldPlayOnStartup(): Boolean = shouldPlayOnStart && !isMuted

    private fun getDefaultBgmFile(): File {
        val cacheFile = File(context.cacheDir, "default-bgm.mp3")
        if (!cacheFile.exists() || cacheFile.length() < 1024L) {
            try {
                context.assets.open("default-bgm.mp3").use { input ->
                    cacheFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return cacheFile
    }

    @Synchronized
    private fun initPlayer(trackId: String, autoPlay: Boolean) {
        try {
            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                if (trackId == "default") {
                    val file = getDefaultBgmFile()
                    setDataSource(file.absolutePath)
                } else {
                    val file = storageManager.getMusicFile(trackId)
                    if (file != null && file.exists()) {
                        setDataSource(file.absolutePath)
                    } else {
                        val fileDefault = getDefaultBgmFile()
                        setDataSource(fileDefault.absolutePath)
                    }
                }
                prepare()
                cachedDurationMs = duration
                applyVolume()
                setOnCompletionListener {
                    if (isShuffle) {
                        playNextRandom()
                    } else {
                        seekTo(0)
                        start()
                    }
                }
                if (autoPlay && !isMuted) {
                    start()
                }
            }
            currentTrackId = trackId
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun applyVolume() {
        val actualVol = if (isMuted) 0f else volume
        mediaPlayer?.setVolume(actualVol, actualVol)
    }

    private fun playNextRandom() {
        try {
            val tracks = storageManager.getMusicTracks()
            val array = org.json.JSONArray(tracks)
            if (array.length() > 0) {
                val randomIndex = (0 until array.length()).random()
                val nextTrackId = array.getJSONObject(randomIndex).optString("id", "default")
                load(nextTrackId, autoPlay = true)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @Synchronized
    fun load(trackId: String, autoPlay: Boolean = true): String {
        initPlayer(trackId, autoPlay)
        persistState()
        return snapshot()
    }

    @Synchronized
    fun play(): String {
        try {
            if (mediaPlayer == null) {
                initPlayer(currentTrackId, autoPlay = true)
            } else {
                mediaPlayer?.start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        persistState()
        return snapshot()
    }

    @Synchronized
    fun pause(): String {
        try {
            mediaPlayer?.pause()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        persistState()
        return snapshot()
    }

    @Synchronized
    fun seek(seconds: Double): String {
        try {
            val ms = (seconds * 1000).toInt().coerceAtLeast(0)
            mediaPlayer?.seekTo(ms)
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return snapshot()
    }

    @Synchronized
    fun setVolume(vol: Float): String {
        volume = vol.coerceIn(0f, 1f)
        if (volume > 0f) isMuted = false
        applyVolume()
        persistState()
        return snapshot()
    }

    @Synchronized
    fun setMuted(muted: Boolean): String {
        isMuted = muted
        applyVolume()
        persistState()
        return snapshot()
    }

    @Synchronized
    fun setShuffle(shuffle: Boolean) {
        isShuffle = shuffle
        persistState()
    }

    @Synchronized
    fun isPlaying(): Boolean {
        return try {
            mediaPlayer?.isPlaying ?: false
        } catch (e: Exception) {
            false
        }
    }

    @Synchronized
    fun snapshot(): String {
        val json = JSONObject()
        val currentMs = try { mediaPlayer?.currentPosition ?: 0 } catch (e: Exception) { 0 }
        json.put("track_id", currentTrackId)
        json.put("time", currentMs / 1000.0)
        json.put("duration", cachedDurationMs / 1000.0)
        json.put("volume", volume.toDouble())
        json.put("muted", isMuted)
        json.put("playing", isPlaying())
        json.put("shuffle", isShuffle)
        return json.toString()
    }

    private fun persistState() {
        storageManager.savePlayerState(snapshot())
    }

    @Synchronized
    fun release() {
        persistState()
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
