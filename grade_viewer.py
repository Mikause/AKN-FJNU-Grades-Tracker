"""福建师范大学教务系统成绩查询桌面客户端。"""

from __future__ import annotations

import base64
import binascii
import ctypes
import json
import os
import subprocess
import sys
import threading
import tempfile
import urllib.request
import winreg
from ctypes import wintypes
from pathlib import Path

import webview


def ensure_webview2_runtime() -> None:
    """Ensure the system WebView2 runtime exists.

    WebView2 is an OS runtime rather than a Python package, so PyInstaller cannot
    embed it in the application.  If it is missing, offer the official Evergreen
    bootstrapper and install it before creating the window.
    """
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
        "猪猪成绩查询",
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
            "猪猪成绩查询",
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
APP_DATA_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "FJNUGradeViewer"
CREDENTIALS_FILE = APP_DATA_DIR / "credentials.dat"
CUSTOM_BACKGROUND_FILE = APP_DATA_DIR / "custom-background.jpg"
ASSETS_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / "assets"
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


def image_data_uri(path: Path) -> str:
    mime_type = "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def load_ui_script(name: str) -> str:
    script = (ASSETS_DIR / name).read_text(encoding="utf-8")
    background_path = (
        CUSTOM_BACKGROUND_FILE
        if CUSTOM_BACKGROUND_FILE.is_file()
        else ASSETS_DIR / "login-background.jpg"
    )
    replacements = {
        "__BACKGROUND_IMAGE__": image_data_uri(background_path),
        "__UNIVERSITY_LOGO__": image_data_uri(ASSETS_DIR / "fjnu-logo.jpg"),
    }
    for marker, value in replacements.items():
        script = script.replace(marker, value)
    return script


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


def clear_custom_background() -> None:
    try:
        CUSTOM_BACKGROUND_FILE.unlink()
    except FileNotFoundError:
        pass


class GradeViewerApi:
    def get_saved_credentials(self) -> dict[str, str]:
        return load_credentials()

    def save_login(self, username: str, password: str, remember: bool) -> None:
        if remember and username and password:
            save_credentials(username, password)
        elif not remember:
            clear_credentials()

    def save_background(self, data_url: str) -> bool:
        save_custom_background(data_url)
        return True

    def reset_background(self) -> str:
        clear_custom_background()
        return image_data_uri(ASSETS_DIR / "login-background.jpg")

    def begin_login(self) -> None:
        global login_in_progress, login_restore_timer
        if login_restore_timer is not None:
            login_restore_timer.cancel()
            login_restore_timer = None
        login_in_progress = True
        # Keep the third-party page out of sight while it performs its redirect.
        window.hide()

    def login_failed(self) -> None:
        global login_in_progress, grade_redirect_pending, login_restore_timer
        login_in_progress = False
        grade_redirect_pending = False
        # The login navigation can finish after the bridge callback. Restore the
        # app on the UI thread and let the page-loaded handler apply the login UI.
        def restore_login() -> None:
            global login_restore_timer
            login_restore_timer = None
            if login_in_progress or grade_redirect_pending:
                return
            try:
                if LOGIN_URL_MARKER not in window.get_current_url():
                    return
                window.evaluate_js(load_ui_script("login-helper.js"))
                window.show()
            except (RuntimeError, AttributeError):
                pass

        login_restore_timer = threading.Timer(0.15, restore_login)
        login_restore_timer.daemon = True
        login_restore_timer.start()

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
    """Keep official redirects hidden until the custom page is ready."""
    global has_loaded_login, grade_redirect_pending, login_in_progress, login_restore_timer
    url = window.get_current_url()

    if LOGIN_URL_MARKER in url:
        if login_in_progress:
            # A successful submit can remain on this URL for an arbitrary time
            # before redirecting. Never guess failure from elapsed time: the
            # injected login script reports failure only when official error
            # text actually exists.
            window.hide()
            if login_restore_timer is not None:
                login_restore_timer.cancel()
                login_restore_timer = None
            window.evaluate_js(LOGIN_FAILURE_WATCHER)
            return

        # A failed submit returns to the official login URL. Rebuild the custom
        # login layer in that new document; otherwise only the loading overlay
        # would remain and the hidden window could never be recovered.
        if login_restore_timer is not None:
            login_restore_timer.cancel()
            login_restore_timer = None
        # Keep the just-loaded official document hidden while the custom layer
        # is rebuilt, so it can never be painted in the foreground.
        window.hide()
        window.evaluate_js(load_ui_script("login-helper.js"))
        # A failed submit navigates back to the official login document. The
        # previous page's pending marker must not suppress the next attempt.
        try:
            window.evaluate_js("sessionStorage.removeItem('fjnu-login-pending');")
        except (RuntimeError, AttributeError):
            pass
        has_loaded_login = True
        grade_redirect_pending = False
        login_in_progress = False
        window.show()
        return

    if GRADE_URL_MARKER in url:
        grade_redirect_pending = True
        # The window may have been restored after a previous failed login.
        # Hide before the official document gets a chance to paint; page_ready
        # is the only path that reveals the fully customized grade view.
        window.hide()
        window.evaluate_js(load_ui_script("loading-helper.js"))
        window.evaluate_js(load_ui_script("grade-helper.js"))
        return

    if has_loaded_login:
        window.evaluate_js(load_ui_script("loading-helper.js"))
        if not grade_redirect_pending:
            grade_redirect_pending = True
            threading.Timer(0.5, lambda: window.load_url(GRADE_URL)).start()


def configure_native_window() -> None:
    """Install a WebView2 document-start guard for login redirects."""
    try:
        core_webview = window.native.browser.webview.CoreWebView2
        if core_webview is not None:
            core_webview.AddScriptToExecuteOnDocumentCreatedAsync(EARLY_NAVIGATION_SCRIPT)
    except (AttributeError, RuntimeError):
        pass

    def recover_initial_window() -> None:
        """Never leave the initial hidden window stranded after a page error."""
        if has_loaded_login or login_in_progress or grade_redirect_pending:
            return
        try:
            if LOGIN_URL_MARKER in window.get_current_url():
                window.evaluate_js(load_ui_script("login-helper.js"))
                window.show()
        except (AttributeError, RuntimeError):
            pass

    startup_timer = threading.Timer(4.0, recover_initial_window)
    startup_timer.daemon = True
    startup_timer.start()


if __name__ == "__main__":
    ensure_webview2_runtime()
    window = webview.create_window(
        "猪猪成绩查询",
        GRADE_URL,
        js_api=GradeViewerApi(),
        width=1280,
        height=820,
        min_size=(960, 640),
        text_select=True,
        hidden=True,
    )
    window.events.loaded += handle_page_loaded
    webview.start(configure_native_window, gui="edgechromium", private_mode=True)
