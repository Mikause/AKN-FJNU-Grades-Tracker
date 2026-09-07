package com.mikause.gradeviewer

import android.webkit.JavascriptInterface
import org.json.JSONObject

class WebAppInterface(
    private val activity: MainActivity,
    private val storageManager: StorageManager,
    private val audioPlayer: AudioPlayerManager
) {

    @JavascriptInterface
    fun loginPageReady() {
        activity.runOnUiThread {
            // Can trigger audio playback if configured
        }
    }

    @JavascriptInterface
    fun getSavedCredentials(): String {
        return storageManager.loadCredentials()
    }

    @JavascriptInterface
    fun saveLogin(username: String, password: String, remember: Boolean) {
        if (remember && username.isNotEmpty() && password.isNotEmpty()) {
            storageManager.saveCredentials(username, password)
        } else if (!remember) {
            storageManager.clearCredentials()
        }
    }

    @JavascriptInterface
    fun saveBackground(dataUrl: String): Boolean {
        return storageManager.saveBackground(dataUrl)
    }

    @JavascriptInterface
    fun resetBackground(): String {
        return storageManager.resetBackground()
    }

    @JavascriptInterface
    fun getBackgroundVideo(): String {
        return storageManager.getBackgroundVideo()
    }

    @JavascriptInterface
    fun getMusicTracks(): String {
        return storageManager.getMusicTracks()
    }

    @JavascriptInterface
    fun saveMusicTrack(name: String, dataUrl: String): String {
        return storageManager.saveMusicTrack(name, dataUrl)
    }

    @JavascriptInterface
    fun getPlayerState(): String {
        return audioPlayer.snapshot()
    }

    @JavascriptInterface
    fun savePlayerState(jsonStr: String) {
        try {
            val obj = JSONObject(jsonStr)
            if (obj.has("shuffle")) {
                audioPlayer.setShuffle(obj.optBoolean("shuffle", false))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun playerLoad(trackId: String): String {
        return audioPlayer.load(trackId, true)
    }

    @JavascriptInterface
    fun playerPlay(): String {
        return audioPlayer.play()
    }

    @JavascriptInterface
    fun playerPause(): String {
        return audioPlayer.pause()
    }

    @JavascriptInterface
    fun playerSeek(seconds: Double): String {
        return audioPlayer.seek(seconds)
    }

    @JavascriptInterface
    fun playerSetVolume(volume: Double): String {
        return audioPlayer.setVolume(volume.toFloat())
    }

    @JavascriptInterface
    fun playerSetMuted(muted: Boolean): String {
        return audioPlayer.setMuted(muted)
    }

    @JavascriptInterface
    fun getUiSettings(): String {
        return storageManager.getUiSettings()
    }

    @JavascriptInterface
    fun saveUiSettings(jsonStr: String): String {
        return storageManager.saveUiSettings(jsonStr)
    }

    @JavascriptInterface
    fun resetUiSettings(): String {
        return storageManager.resetUiSettings()
    }

    @JavascriptInterface
    fun beginLogin() {
        activity.runOnUiThread {
            activity.showLoading(true)
        }
    }

    @JavascriptInterface
    fun loginFailed() {
        activity.runOnUiThread {
            activity.showLoading(false)
        }
    }

    @JavascriptInterface
    fun pageReady() {
        activity.runOnUiThread {
            activity.showLoading(false)
        }
    }

    fun getBridgeShimScript(): String {
        val bgUri = storageManager.getBackgroundImageUri().replace("'", "\\'")
        val uiJson = storageManager.getUiSettings().replace("'", "\\'")

        return """
        (() => {
            window.__BACKGROUND_IMAGE_DATA_URI__ = '$bgUri';
            try {
                window.__UI_SETTINGS_JSON__ = JSON.parse('$uiJson');
            } catch (e) {
                window.__UI_SETTINGS_JSON__ = {};
            }

            if (!window.pywebview) {
                window.pywebview = {
                    api: {
                        login_page_ready: () => Promise.resolve(window.NativeBridge.loginPageReady()),
                        get_saved_credentials: () => Promise.resolve(JSON.parse(window.NativeBridge.getSavedCredentials() || '{}')),
                        save_login: (u, p, r) => Promise.resolve(window.NativeBridge.saveLogin(u, p, !!r)),
                        save_background: (url) => Promise.resolve(window.NativeBridge.saveBackground(url)),
                        reset_background: () => Promise.resolve(window.NativeBridge.resetBackground()),
                        get_background_video: () => Promise.resolve(window.NativeBridge.getBackgroundVideo() || ''),
                        get_music_tracks: () => Promise.resolve(JSON.parse(window.NativeBridge.getMusicTracks() || '[]')),
                        save_music_track: (n, u) => Promise.resolve(JSON.parse(window.NativeBridge.saveMusicTrack(n, u) || '[]')),
                        get_player_state: () => Promise.resolve(JSON.parse(window.NativeBridge.getPlayerState() || '{}')),
                        save_player_state: (s) => Promise.resolve(window.NativeBridge.savePlayerState(JSON.stringify(s))),
                        player_load: (id) => Promise.resolve(JSON.parse(window.NativeBridge.playerLoad(id) || '{}')),
                        player_play: () => Promise.resolve(JSON.parse(window.NativeBridge.playerPlay() || '{}')),
                        player_pause: () => Promise.resolve(JSON.parse(window.NativeBridge.playerPause() || '{}')),
                        player_seek: (sec) => Promise.resolve(JSON.parse(window.NativeBridge.playerSeek(sec) || '{}')),
                        player_set_volume: (vol) => Promise.resolve(JSON.parse(window.NativeBridge.playerSetVolume(vol) || '{}')),
                        player_set_muted: (m) => Promise.resolve(JSON.parse(window.NativeBridge.playerSetMuted(!!m) || '{}')),
                        get_ui_settings: () => Promise.resolve(JSON.parse(window.NativeBridge.getUiSettings() || '{}')),
                        save_ui_settings: (s) => Promise.resolve(JSON.parse(window.NativeBridge.saveUiSettings(JSON.stringify(s)))),
                        reset_ui_settings: () => Promise.resolve(JSON.parse(window.NativeBridge.resetUiSettings() || '{}')),
                        begin_login: () => Promise.resolve(window.NativeBridge.beginLogin()),
                        login_failed: () => Promise.resolve(window.NativeBridge.loginFailed()),
                        page_ready: () => Promise.resolve(window.NativeBridge.pageReady())
                    }
                };
            }
        })();
        """.trimIndent()
    }
}
