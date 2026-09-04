"""福建师范大学教务系统成绩查询桌面客户端。"""

from __future__ import annotations

import base64
import binascii
import ctypes
import json
import math
import os
import queue
import re
import subprocess
import sys
import threading
import tempfile
import traceback
import urllib.request
import winreg
from ctypes import wintypes
from pathlib import Path

import webview


APP_TITLE = "粥粥FJNU成绩查询"
APP_TITLE_EN = "AKN FJNU Grades Tracker"


def ensure_webview2_runtime() -> None:
    """检查并确保系统中已安装 WebView2 运行时，缺失时提示下载安装。"""
    client_id = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
    locations = (
        (winreg.HKEY_CURRENT_USER, rf"SOFTWARE\Microsoft\EdgeUpdate\Clients\{client_id}"),
        (winreg.HKEY_LOCAL_MACHINE, rf"SOFTWARE\Microsoft\EdgeUpdate\Clients\{client_id}"),
        (winreg.HKEY_LOCAL_MACHINE, rf"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{client_id}"),
    )
    for root, path in locations:
        try:
            with winreg.OpenKey(root, path) as key:
                version = str(winreg.QueryValueEx(key, "pv")[0])
                if version and version != "0.0.0.0":
                    return
        except OSError:
            continue

    answer = ctypes.windll.user32.MessageBoxW(
        None,
        "此电脑缺少 Microsoft Edge WebView2 Runtime。\n\n"
        "点击“是”将从微软官网下载并安装运行时（约几 MB），安装完成后即可使用。",
        APP_TITLE,
        0x34,  # MB_ICONWARNING | MB_YESNO
    )
    if answer != 6:  # IDYES
        raise SystemExit(1)

    installer = Path(tempfile.gettempdir()) / "MicrosoftEdgeWebView2Setup.exe"
    try:
        urllib.request.urlretrieve(
            "https://go.microsoft.com/fwlink/?linkid=2124703", installer
        )
        result = subprocess.run(
            [str(installer), "/silent", "/install"],
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if result.returncode != 0:
            raise RuntimeError(f"WebView2 installer exited with {result.returncode}")
    except Exception as exc:
        ctypes.windll.user32.MessageBoxW(
            None,
            "WebView2 安装失败，请手动安装微软 Evergreen Runtime 后重试。\n\n"
            + str(exc),
            APP_TITLE,
            0x10,
        )
        raise SystemExit(1) from exc
    finally:
        try:
            installer.unlink()
        except OSError:
            pass


GRADE_URL = (
    "https://jwglxt.fjnu.edu.cn/jwglxt/cjcx/cjcx_cxDgXscj.html"
    "?gnmkdm=N305005&layout=default"
)
LOGIN_URL_MARKER = "/jwglxt/xtgl/login_slogin.html"
GRADE_URL_MARKER = "/jwglxt/cjcx/cjcx_cxDgXscj.html"

DEFAULT_TRACK_NAME = "秋绪"
APP_DATA_FOLDER = "FJNUGradeViewer"
APP_DATA_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / APP_DATA_FOLDER
CREDENTIALS_FILE = APP_DATA_DIR / "credentials.dat"
CUSTOM_BACKGROUND_FILE = APP_DATA_DIR / "custom-background.jpg"
CUSTOM_BACKGROUND_VIDEO_FILE = APP_DATA_DIR / "custom-background.mp4"
CUSTOM_BACKGROUND_VIDEO_TYPE_FILE = APP_DATA_DIR / "custom-background.type"
MUSIC_DIR = APP_DATA_DIR / "music"
PLAYER_STATE_FILE = APP_DATA_DIR / "player-state.json"

if getattr(sys, "frozen", False):
    ASSETS_DIR = Path(sys._MEIPASS) / "assets"
else:
    ASSETS_DIR = Path(__file__).resolve().parent / "assets"

DEFAULT_BACKGROUND_FILE = ASSETS_DIR / "login-background.webp"
DEFAULT_MUSIC_FILE = ASSETS_DIR / "default-bgm.mp3"

EARLY_NAVIGATION_SCRIPT = """
(() => {
  try {
    const isGradePage = location.pathname.includes('/jwglxt/cjcx/cjcx_cxDgXscj.html');
    if (isGradePage || sessionStorage.getItem('fjnu-login-pending') === '1') {
      document.documentElement.style.visibility = 'hidden';
      document.documentElement.style.background = '#d8d0c5';
    }
  } catch (error) {}
})();
"""
LOGIN_FAILURE_WATCHER = """
(() => {
  if (window.__fjnuLoginFailureWatcher) return;
  window.__fjnuLoginFailureWatcher = true;
  let reported = false;
  const report = () => {
    const message = document.querySelector('#tips')?.textContent?.trim();
    if (message && !reported) {
      reported = true;
      window.pywebview?.api?.login_failed?.();
    }
  };
  report();
  new MutationObserver(report).observe(document.documentElement, {
    childList: true, subtree: true, characterData: true
  });
})();
"""

_IMAGE_URI_CACHE: dict[str, tuple[float, str]] = {}


def image_data_uri(path: Path) -> str:
    path_resolved = path.resolve()
    path_key = str(path_resolved)
    try:
        mtime = path_resolved.stat().st_mtime
    except OSError:
        mtime = 0.0

    cached = _IMAGE_URI_CACHE.get(path_key)
    if cached is not None and cached[0] == mtime:
        return cached[1]

    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        mime_type = "image/jpeg"
    elif suffix == ".webp":
        mime_type = "image/webp"
    else:
        mime_type = "image/png"

    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    uri = f"data:{mime_type};base64,{encoded}"
    _IMAGE_URI_CACHE[path_key] = (mtime, uri)
    return uri


def video_data_uri(path: Path) -> str:
    try:
        mime_type = CUSTOM_BACKGROUND_VIDEO_TYPE_FILE.read_text(encoding="ascii")
    except OSError:
        mime_type = "video/mp4"
    if mime_type not in {"video/mp4", "video/webm", "video/ogg"}:
        mime_type = "video/mp4"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def music_tracks() -> list[dict[str, str]]:
    tracks = [{"id": "default", "name": DEFAULT_TRACK_NAME}]
    if MUSIC_DIR.is_dir():
        for path in sorted(MUSIC_DIR.glob("*.mp3"), key=lambda item: item.name.lower()):
            tracks.append({"id": path.name, "name": path.stem})
    return tracks


DEFAULT_PLAYER_STATE: dict[str, object] = {
    "track_id": "default",
    "time": 0.0,
    "volume": 0.7,
    "muted": False,
    "playing": True,
    "shuffle": False,
}


def normalize_player_state(state: object) -> dict[str, object]:
    if not isinstance(state, dict):
        state = {}
    available = {track["id"] for track in music_tracks()}
    track_id = str(state.get("track_id", "default"))
    try:
        time_value = float(state.get("time", 0.0))
        volume = float(state.get("volume", 0.7))
    except (TypeError, ValueError):
        time_value, volume = 0.0, 0.7
    if not math.isfinite(time_value):
        time_value = 0.0
    if not math.isfinite(volume):
        volume = 0.7
    return {
        "track_id": track_id if track_id in available else "default",
        "time": max(0.0, time_value),
        "volume": min(1.0, max(0.0, volume)),
        "muted": bool(state.get("muted", False)),
        "playing": bool(state.get("playing", True)),
        "shuffle": bool(state.get("shuffle", False)),
    }


def load_player_state() -> dict[str, object]:
    try:
        return normalize_player_state(json.loads(PLAYER_STATE_FILE.read_text(encoding="utf-8")))
    except (OSError, ValueError, UnicodeDecodeError):
        return dict(DEFAULT_PLAYER_STATE)


def persist_player_state(state: dict[str, object]) -> None:
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    temporary_file = PLAYER_STATE_FILE.with_suffix(".tmp")
    persistent_state = {key: value for key, value in state.items() if key != "time"}
    temporary_file.write_text(
        json.dumps(persistent_state, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    temporary_file.replace(PLAYER_STATE_FILE)


def music_path(track_id: str) -> Path:
    if track_id == "default":
        path = DEFAULT_MUSIC_FILE
    else:
        if not isinstance(track_id, str) or Path(track_id).name != track_id:
            raise ValueError("歌曲标识无效")
        path = MUSIC_DIR / track_id
    if not path.is_file() or path.suffix.lower() != ".mp3":
        raise FileNotFoundError("歌曲不存在")
    return path


class NativeAudioPlayer:
    """基于 Windows MCI 的原生音频播放器，在独立后台线程运行，避免页面跳转导致音乐中断。"""

    def __init__(self, state: dict[str, object]) -> None:
        self.alias = "akn_grade_bgm"
        self.track_id = str(state["track_id"])
        self.volume = float(state["volume"])
        self.muted = bool(state["muted"])
        self.opened = False
        self.paused_position_ms: int | None = None
        self.cached_length_ms: int = 0
        self.requests: queue.Queue[tuple[object, tuple[object, ...], threading.Event, list[object]]] = queue.Queue()
        self.audio_thread = threading.Thread(target=self._audio_loop, daemon=True)
        self.audio_thread.start()
        # 预加载上次选中的曲目，等界面准备就绪后再播放
        self._invoke(self._load_direct, self.track_id, False, 0.0)

    def _audio_loop(self) -> None:
        while True:
            function, args, completed, result = self.requests.get()
            if function is None:
                completed.set()
                return
            try:
                result.append(function(*args))
            except BaseException as error:
                result.append(error)
            finally:
                completed.set()

    def _invoke(self, function: object, *args: object) -> object:
        completed = threading.Event()
        result: list[object] = []
        self.requests.put((function, args, completed, result))
        if not completed.wait(5):
            raise TimeoutError("音频线程响应超时")
        if result and isinstance(result[0], BaseException):
            raise result[0]
        return result[0] if result else None

    def _command(self, command: str, result_size: int = 0) -> str:
        buffer = ctypes.create_unicode_buffer(result_size) if result_size else None
        error = ctypes.windll.winmm.mciSendStringW(command, buffer, result_size, None)
        if error:
            message = ctypes.create_unicode_buffer(256)
            ctypes.windll.winmm.mciGetErrorStringW(error, message, len(message))
            raise RuntimeError(f"MCI {error}: {message.value}")
        return buffer.value if buffer is not None else ""

    def _status_number(self, name: str) -> int:
        try:
            return int(self._command(f"status {self.alias} {name}", 64))
        except (RuntimeError, ValueError):
            return 0

    def _load_direct(self, track_id: str, play: bool, position: float = 0.0) -> None:
        if self.opened:
            try:
                self._command(f"close {self.alias}")
            except RuntimeError:
                pass
        path = music_path(track_id)
        escaped_path = str(path).replace('"', '""')
        self._command(f'open "{escaped_path}" type mpegvideo alias {self.alias}')
        self.opened = True
        self.track_id = track_id
        self.paused_position_ms = None
        self.cached_length_ms = self._status_number("length")
        self._apply_volume()
        if position > 0:
            self._seek_direct(position)
        if play:
            self._command(f"play {self.alias}")

    def _apply_volume(self) -> None:
        level = 0 if self.muted else round(self.volume * 1000)
        self._command(f"setaudio {self.alias} volume to {level}")

    def load(self, track_id: str, play: bool) -> None:
        self._invoke(self._load_direct, track_id, play, 0.0)

    def play(self) -> None:
        self._invoke(self._play_direct)

    def _play_direct(self) -> None:
        position = (
            self.paused_position_ms
            if self.paused_position_ms is not None
            else self._status_number("position")
        )
        length = self.cached_length_ms or self._status_number("length")
        if length and position >= length - 250:
            position = 0
        # 部分系统环境下 MCI 恢复播放需要显式指定起始位置
        self._command(f"play {self.alias} from {position}")
        self.paused_position_ms = None

    def pause(self) -> None:
        self._invoke(self._pause_direct)

    def _pause_direct(self) -> None:
        self._command(f"pause {self.alias}")
        self.paused_position_ms = self._status_number("position")

    def seek(self, seconds: float) -> None:
        self._invoke(self._seek_direct, seconds)

    def _seek_direct(self, seconds: float) -> None:
        milliseconds = max(0, round(float(seconds) * 1000))
        was_playing = self._is_playing_direct()
        self._command(f"seek {self.alias} to {milliseconds}")
        if was_playing:
            self._command(f"play {self.alias} from {milliseconds}")
            self.paused_position_ms = None
        else:
            self.paused_position_ms = milliseconds

    def set_volume(self, volume: float) -> None:
        self._invoke(self._set_volume_direct, volume)

    def _set_volume_direct(self, volume: float) -> None:
        self.volume = min(1.0, max(0.0, float(volume)))
        if self.volume > 0:
            self.muted = False
        self._apply_volume()

    def set_muted(self, muted: bool) -> None:
        self._invoke(self._set_muted_direct, muted)

    def _set_muted_direct(self, muted: bool) -> None:
        self.muted = bool(muted)
        self._apply_volume()

    def is_playing(self) -> bool:
        return bool(self._invoke(self._is_playing_direct))

    def _is_playing_direct(self) -> bool:
        if not self.opened:
            return False
        try:
            return self._command(f"status {self.alias} mode", 32).lower() == "playing"
        except RuntimeError:
            return False

    def snapshot(self) -> dict[str, object]:
        return dict(self._invoke(self._snapshot_direct))

    def _snapshot_direct(self) -> dict[str, object]:
        return {
            "track_id": self.track_id,
            "time": self._status_number("position") / 1000,
            "duration": (self.cached_length_ms or self._status_number("length")) / 1000,
            "volume": self.volume,
            "muted": self.muted,
            "playing": self._is_playing_direct(),
        }

    def close(self) -> None:
        self._invoke(self._close_direct)
        completed = threading.Event()
        self.requests.put((None, (), completed, []))
        completed.wait(2)

    def _close_direct(self) -> None:
        if self.opened:
            try:
                self._command(f"close {self.alias}")
            except RuntimeError:
                pass
            self.opened = False
            self.paused_position_ms = None
            self.cached_length_ms = 0


def load_ui_script(name: str) -> str:
    script = (ASSETS_DIR / name).read_text(encoding="utf-8")
    if "__BACKGROUND_IMAGE__" in script:
        background_path = CUSTOM_BACKGROUND_FILE if CUSTOM_BACKGROUND_FILE.is_file() else DEFAULT_BACKGROUND_FILE
        script = script.replace("__BACKGROUND_IMAGE__", image_data_uri(background_path))
    if "__BACKGROUND_VIDEO__" in script:
        script = script.replace("__BACKGROUND_VIDEO__", "")
    if "__UNIVERSITY_LOGO__" in script:
        script = script.replace("__UNIVERSITY_LOGO__", image_data_uri(ASSETS_DIR / "fjnu-logo.jpg"))
    if "__DEFAULT_TRACK_NAME__" in script:
        script = script.replace("__DEFAULT_TRACK_NAME__", DEFAULT_TRACK_NAME)
    return script


def inject_ui_script(name: str, include_player: bool = True) -> None:
    code = load_ui_script(name)
    if include_player:
        code = code + "\n" + load_ui_script("player-helper.js")
    window.evaluate_js(code)


def show_login_window() -> None:
    """登录页渲染完成后展示窗口并准备播放音频。"""
    window.show()
    window.evaluate_js(
        "requestAnimationFrame(() => requestAnimationFrame(() => "
        "window.pywebview?.api?.login_page_ready?.()));"
    )


class DataBlob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_byte))]


def _blob(data: bytes) -> tuple[DataBlob, ctypes.Array[ctypes.c_char]]:
    buffer = ctypes.create_string_buffer(data)
    return DataBlob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte))), buffer


def protect(data: bytes) -> bytes:
    source, source_buffer = _blob(data)
    protected = DataBlob()
    if not ctypes.windll.crypt32.CryptProtectData(
        ctypes.byref(source), None, None, None, None, 0, ctypes.byref(protected)
    ):
        raise ctypes.WinError()
    try:
        return ctypes.string_at(protected.pbData, protected.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(protected.pbData)


def unprotect(data: bytes) -> bytes:
    source, source_buffer = _blob(data)
    plain = DataBlob()
    if not ctypes.windll.crypt32.CryptUnprotectData(
        ctypes.byref(source), None, None, None, None, 0, ctypes.byref(plain)
    ):
        raise ctypes.WinError()
    try:
        return ctypes.string_at(plain.pbData, plain.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(plain.pbData)


def load_credentials() -> dict[str, str]:
    try:
        stored = json.loads(unprotect(CREDENTIALS_FILE.read_bytes()).decode("utf-8"))
        return {
            "username": str(stored.get("username", "")),
            "password": str(stored.get("password", "")),
        }
    except (OSError, ValueError, UnicodeDecodeError):
        return {"username": "", "password": ""}


def save_credentials(username: str, password: str) -> None:
    payload = json.dumps(
        {"username": username, "password": password}, ensure_ascii=False
    ).encode("utf-8")
    CREDENTIALS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CREDENTIALS_FILE.write_bytes(protect(payload))


def clear_credentials() -> None:
    try:
        CREDENTIALS_FILE.unlink()
    except FileNotFoundError:
        pass


def save_custom_background(data_url: str) -> None:
    prefix = "data:image/jpeg;base64,"
    if not isinstance(data_url, str) or not data_url.startswith(prefix):
        raise ValueError("仅支持裁切器生成的 JPEG 图片")

    try:
        image = base64.b64decode(data_url[len(prefix) :], validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("背景图片数据无效") from exc

    if not image.startswith(b"\xff\xd8\xff") or len(image) > 12 * 1024 * 1024:
        raise ValueError("背景图片格式无效或文件过大")

    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    temporary_file = CUSTOM_BACKGROUND_FILE.with_suffix(".tmp")
    temporary_file.write_bytes(image)
    temporary_file.replace(CUSTOM_BACKGROUND_FILE)
    for path in (CUSTOM_BACKGROUND_VIDEO_FILE, CUSTOM_BACKGROUND_VIDEO_TYPE_FILE):
        try:
            path.unlink()
        except FileNotFoundError:
            pass


def save_custom_background_video(data_url: str) -> None:
    if not isinstance(data_url, str) or not data_url.startswith("data:video/"):
        raise ValueError("仅支持视频背景")
    try:
        header, encoded = data_url.split(",", 1)
        video = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("背景视频数据无效") from exc
    if len(video) > 50 * 1024 * 1024:
        raise ValueError("背景视频不能超过 50 MB")
    mime_type = header.removeprefix("data:").split(";", 1)[0]
    if mime_type not in {"video/mp4", "video/webm", "video/ogg"}:
        raise ValueError("仅支持 MP4、WebM 或 OGG 视频")
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    temporary_file = CUSTOM_BACKGROUND_VIDEO_FILE.with_suffix(".tmp")
    temporary_file.write_bytes(video)
    temporary_file.replace(CUSTOM_BACKGROUND_VIDEO_FILE)
    CUSTOM_BACKGROUND_VIDEO_TYPE_FILE.write_text(mime_type, encoding="ascii")
    try:
        CUSTOM_BACKGROUND_FILE.unlink()
    except FileNotFoundError:
        pass


def clear_custom_background() -> None:
    try:
        CUSTOM_BACKGROUND_FILE.unlink()
    except FileNotFoundError:
        pass
    for path in (CUSTOM_BACKGROUND_VIDEO_FILE, CUSTOM_BACKGROUND_VIDEO_TYPE_FILE):
        try:
            path.unlink()
        except FileNotFoundError:
            pass


class GradeViewerApi:
    def __init__(self) -> None:
        self.player_state = load_player_state()
        self.player_state_lock = threading.RLock()
        self.startup_should_play = bool(self.player_state["playing"])
        self.startup_playback_released = False
        self.audio_player = NativeAudioPlayer(self.player_state)

    def login_page_ready(self) -> None:
        """登录页可见后，按需启动音频播放。"""
        with self.player_state_lock:
            if self.startup_playback_released:
                return
            self.startup_playback_released = True
            if self.startup_should_play:
                self.audio_player.play()

    def get_saved_credentials(self) -> dict[str, str]:
        return load_credentials()

    def save_login(self, username: str, password: str, remember: bool) -> None:
        if remember and username and password:
            save_credentials(username, password)
        elif not remember:
            clear_credentials()

    def save_background(self, data_url: str) -> bool:
        if data_url.startswith("data:video/"):
            save_custom_background_video(data_url)
        else:
            save_custom_background(data_url)
        return True

    def reset_background(self) -> str:
        clear_custom_background()
        return image_data_uri(DEFAULT_BACKGROUND_FILE)

    def get_background_video(self) -> str:
        return video_data_uri(CUSTOM_BACKGROUND_VIDEO_FILE) if CUSTOM_BACKGROUND_VIDEO_FILE.is_file() else ""

    def get_music_tracks(self) -> list[dict[str, str]]:
        return music_tracks()

    def save_music_track(self, name: str, data_url: str) -> list[dict[str, str]]:
        prefixes = ("data:audio/mpeg;base64,", "data:audio/mp3;base64,", "data:audio/x-mpeg;base64,")
        prefix = next((value for value in prefixes if isinstance(data_url, str) and data_url.startswith(value)), None)
        if prefix is None:
            raise ValueError("仅支持 MP3 文件")
        try:
            audio = base64.b64decode(data_url[len(prefix):], validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("MP3 数据无效") from exc
        if not audio or len(audio) > 30 * 1024 * 1024:
            raise ValueError("单个 MP3 不能超过 30 MB")
        stem = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", Path(str(name)).stem).strip(" .")[:80] or "track"
        MUSIC_DIR.mkdir(parents=True, exist_ok=True)
        path = MUSIC_DIR / f"{stem}.mp3"
        suffix = 2
        while path.exists():
            path = MUSIC_DIR / f"{stem} ({suffix}).mp3"
            suffix += 1
        path.write_bytes(audio)
        return music_tracks()

    def get_player_state(self) -> dict[str, object]:
        with self.player_state_lock:
            snapshot = self.audio_player.snapshot()
            snapshot["shuffle"] = bool(self.player_state["shuffle"])
            return snapshot

    def save_player_state(self, state: dict[str, object]) -> None:
        if not isinstance(state, dict):
            return
        with self.player_state_lock:
            current = self.audio_player.snapshot()
            current["shuffle"] = bool(state.get("shuffle", self.player_state["shuffle"]))
            normalized = normalize_player_state(current)
            self.player_state = normalized
            persist_player_state(normalized)

    def player_load(self, track_id: str) -> dict[str, object]:
        with self.player_state_lock:
            self.startup_playback_released = True
            self.audio_player.load(track_id, True)
            self._persist_audio_state()
            return self.get_player_state()

    def player_play(self) -> dict[str, object]:
        with self.player_state_lock:
            self.startup_playback_released = True
            self.audio_player.play()
            self._persist_audio_state()
            return self.get_player_state()

    def player_pause(self) -> dict[str, object]:
        with self.player_state_lock:
            self.startup_playback_released = True
            self.audio_player.pause()
            self._persist_audio_state()
            return self.get_player_state()

    def player_seek(self, seconds: float) -> dict[str, object]:
        with self.player_state_lock:
            self.audio_player.seek(seconds)
            return self.get_player_state()

    def player_set_volume(self, volume: float) -> dict[str, object]:
        with self.player_state_lock:
            self.audio_player.set_volume(volume)
            return self.get_player_state()

    def player_set_muted(self, muted: bool) -> dict[str, object]:
        with self.player_state_lock:
            self.audio_player.set_muted(muted)
            self._persist_audio_state()
            return self.get_player_state()

    def _persist_audio_state(self) -> None:
        current = self.audio_player.snapshot()
        current["shuffle"] = bool(self.player_state["shuffle"])
        self.player_state = normalize_player_state(current)
        persist_player_state(self.player_state)

    def close(self, *_args: object) -> None:
        with self.player_state_lock:
            if self.startup_playback_released:
                self._persist_audio_state()
            else:
                current = self.audio_player.snapshot()
                current["playing"] = self.startup_should_play
                current["shuffle"] = bool(self.player_state["shuffle"])
                self.player_state = normalize_player_state(current)
                persist_player_state(self.player_state)
            self.audio_player.close()

    def begin_login(self) -> None:
        global login_in_progress, login_restore_timer
        if login_restore_timer is not None:
            login_restore_timer.cancel()
            login_restore_timer = None
        login_in_progress = True
        # 提交后先隐藏窗口，避免官方跳转过渡页闪烁
        window.hide()

    def login_failed(self) -> None:
        global login_in_progress, grade_redirect_pending, login_restore_timer, has_loaded_login
        login_in_progress = False
        grade_redirect_pending = False
        has_loaded_login = True
        if login_restore_timer is not None:
            login_restore_timer.cancel()
            login_restore_timer = None
        try:
            if LOGIN_URL_MARKER in window.get_current_url():
                window.evaluate_js("sessionStorage.removeItem('fjnu-login-pending');")
                inject_ui_script("login-helper.js")
                show_login_window()
        except (RuntimeError, AttributeError):
            pass

    def page_ready(self) -> None:
        global login_in_progress, has_loaded_login, grade_redirect_pending
        login_in_progress = False
        has_loaded_login = False
        grade_redirect_pending = False
        window.show()


has_loaded_login = False
grade_redirect_pending = False
login_in_progress = False
login_restore_timer: threading.Timer | None = None


def handle_page_loaded() -> None:
    """页面加载完成回调：根据当前 URL 注入对应脚本并控制窗口显示。"""
    global has_loaded_login, grade_redirect_pending, login_in_progress, login_restore_timer
    url = window.get_current_url()

    if LOGIN_URL_MARKER in url:
        if login_in_progress:
            # 登录处理中，监控是否出现错误提示
            window.hide()
            if login_restore_timer is not None:
                login_restore_timer.cancel()
                login_restore_timer = None
            window.evaluate_js(LOGIN_FAILURE_WATCHER)
            return

        # 初始进入或登录失败回到登录页，重新注入自定义登录界面
        if login_restore_timer is not None:
            login_restore_timer.cancel()
            login_restore_timer = None
        window.hide()
        inject_ui_script("login-helper.js")
        try:
            window.evaluate_js("sessionStorage.removeItem('fjnu-login-pending');")
        except (RuntimeError, AttributeError):
            pass
        has_loaded_login = True
        grade_redirect_pending = False
        login_in_progress = False
        show_login_window()
        return

    if GRADE_URL_MARKER in url:
        grade_redirect_pending = True
        # 进入成绩查询页，注入加载遮罩与成绩页重构脚本
        window.hide()
        inject_ui_script("loading-helper.js", include_player=False)
        inject_ui_script("grade-helper.js")
        return

    if has_loaded_login:
        inject_ui_script("loading-helper.js")
        if not grade_redirect_pending:
            grade_redirect_pending = True
            threading.Timer(0.5, lambda: window.load_url(GRADE_URL)).start()


def configure_native_window() -> None:
    """初始化 WebView2 配置与防卡死兜底定时器。"""
    try:
        core_webview = window.native.browser.webview.CoreWebView2
        if core_webview is not None:
            core_webview.AddScriptToExecuteOnDocumentCreatedAsync(EARLY_NAVIGATION_SCRIPT)
    except (AttributeError, RuntimeError):
        pass

    def recover_initial_window() -> None:
        """防止网络异常导致窗口长时间隐藏的兜底处理。"""
        try:
            current_url = window.get_current_url()
            if LOGIN_URL_MARKER in current_url:
                inject_ui_script("login-helper.js")
                show_login_window()
            elif GRADE_URL_MARKER in current_url:
                inject_ui_script("loading-helper.js", include_player=False)
                inject_ui_script("grade-helper.js")
        except (AttributeError, RuntimeError):
            pass

    startup_timer = threading.Timer(4.0, recover_initial_window)
    startup_timer.daemon = True
    startup_timer.start()


def write_crash_log(error: BaseException) -> Path:
    """记录启动崩溃日志便于排查问题。"""
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    log_file = APP_DATA_DIR / "startup-error.log"
    log_file.write_text(
        "".join(traceback.format_exception(type(error), error, error.__traceback__)),
        encoding="utf-8",
    )
    return log_file


def main() -> None:
    global window
    try:
        ensure_webview2_runtime()
        app_api = GradeViewerApi()
        window = webview.create_window(
            APP_TITLE,
            GRADE_URL,
            js_api=app_api,
            width=1280,
            height=820,
            min_size=(960, 640),
            text_select=True,
            hidden=True,
        )
        window.events.loaded += handle_page_loaded
        window.events.closed += app_api.close
        webview.start(configure_native_window, gui="edgechromium", private_mode=True)
    except BaseException as error:
        log_file = write_crash_log(error)
        ctypes.windll.user32.MessageBoxW(
            None,
            f"软件启动失败。\n\n错误日志已保存到：\n{log_file}",
            APP_TITLE,
            0x10,
        )


if __name__ == "__main__":
    main()
