package com.mikause.gradeviewer

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    companion object {
        private const val LOGIN_URL = "https://jwglxt.fjnu.edu.cn/jwglxt/xtgl/login_slogin.html"
        private const val GRADE_URL = "https://jwglxt.fjnu.edu.cn/jwglxt/cjcx/cjcx_cxDgXscj.html?gnmkdm=N305005&layout=default"
        private const val LOGIN_MARKER = "/jwglxt/xtgl/login_slogin.html"
        private const val GRADE_MARKER = "/jwglxt/cjcx/cjcx_cxDgXscj.html"
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var storageManager: StorageManager
    private lateinit var audioPlayer: AudioPlayerManager
    private lateinit var webAppInterface: WebAppInterface

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results: Array<Uri>? = if (result.resultCode == RESULT_OK) {
                val data = result.data
                if (data?.clipData != null) {
                    val count = data.clipData!!.itemCount
                    Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                } else if (data?.data != null) {
                    arrayOf(data.data!!)
                } else null
            } else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        storageManager = StorageManager(this)
        audioPlayer = AudioPlayerManager(this, storageManager)
        webAppInterface = WebAppInterface(this, storageManager, audioPlayer)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        setupBackNavigation()

        findViewById<View>(R.id.splashOverlay)?.postDelayed({ hideSplash() }, 6000)

        webView.loadUrl(LOGIN_URL)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.addJavascriptInterface(webAppInterface, "NativeBridge")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                url ?: return

                // 页面重新加载或跳转时（如密码错误刷新页面），立即恢复原生遮罩，彻底杜绝正方原生登录页/错误提示表格闪烁
                val splash = findViewById<View>(R.id.splashOverlay)
                splash?.apply {
                    animate().cancel()
                    alpha = 1f
                    visibility = View.VISIBLE
                }

                // 立即隐藏原生旧网页内容，显示中性底色，杜绝正方旧网页白屏/表格闪烁
                injectJs("document.documentElement.style.visibility = 'hidden'; document.documentElement.style.background = '#d8d0c5';")

                // 注入初始桥接垫片
                injectJs(webAppInterface.getBridgeShimScript())
            }

            override fun onPageCommitVisible(view: WebView?, url: String?) {
                super.onPageCommitVisible(view, url)
                // 首次开始渲染 DOM 时，若自定义界面未就绪，继续强制隐藏原生网页
                injectJs("if (!window.__fjnuLoginGlass && !window.__fjnuGradeGlass) { document.documentElement.style.visibility = 'hidden'; document.documentElement.style.background = '#d8d0c5'; }")
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    hideSplash()
                    showLoading(false)
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                url ?: return

                injectJs(webAppInterface.getBridgeShimScript())

                when {
                    url.contains(LOGIN_MARKER) -> {
                        // 注入登录页脚本：必须先注入 login-helper.js 构建登录 DOM（它会重构 body），
                        // 然后再注入 ui-helper.js 和 player-helper.js，避免弹窗与播放器组件被吸入 officialPage。
                        // 注意：切勿注入 loading-helper.js，其未隔离的 .field 等样式会污染登录输入框。
                        injectAssetJs("login-helper.js")
                        injectAssetJs("ui-helper.js")
                        injectAssetJs("player-helper.js")
                        injectJs("requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.style.visibility = 'visible'; window.pywebview?.api?.login_page_ready?.(); }));")
                    }
                    url.contains(GRADE_MARKER) -> {
                        // 注入成绩页脚本
                        injectAssetJs("grade-helper.js")
                        injectAssetJs("ui-helper.js")
                        injectAssetJs("player-helper.js")
                        injectJs("requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.style.visibility = 'visible'; window.pywebview?.api?.page_ready?.(); }));")
                    }
                    url.contains("index_initMenu.html") || (!url.contains(LOGIN_MARKER) && !url.contains(GRADE_MARKER)) -> {
                        // 登录成功跳转至成绩查询页
                        view?.loadUrl(GRADE_URL)
                    }
                }
            }
        }
    }

    private fun injectJs(script: String) {
        webView.evaluateJavascript(script, null)
    }

    private fun loadUiScript(assetPath: String): String {
        return try {
            var script = assets.open(assetPath).use { it.reader().readText() }
            if (script.contains("__BACKGROUND_IMAGE__")) {
                val bgUri = storageManager.getBackgroundImageUri()
                script = script.replace("__BACKGROUND_IMAGE__", bgUri)
            }
            if (script.contains("__BACKGROUND_VIDEO__")) {
                val videoUri = storageManager.getBackgroundVideo()
                script = script.replace("__BACKGROUND_VIDEO__", videoUri)
            }
            if (script.contains("__UNIVERSITY_LOGO__")) {
                val logoUri = storageManager.getLogoUri()
                script = script.replace("__UNIVERSITY_LOGO__", logoUri)
            }
            if (script.contains("__DEFAULT_TRACK_NAME__")) {
                script = script.replace("__DEFAULT_TRACK_NAME__", "秋绪 (默认)")
            }
            if (script.contains("__UI_SETTINGS_JSON__")) {
                script = script.replace("__UI_SETTINGS_JSON__", storageManager.getUiSettings())
            }
            script
        } catch (e: Exception) {
            ""
        }
    }

    private fun injectAssetJs(assetPath: String) {
        val script = loadUiScript(assetPath)
        if (script.isNotEmpty()) {
            webView.evaluateJavascript(script, null)
        }
    }

    fun hideSplash() {
        val splash = findViewById<View>(R.id.splashOverlay)
        if (splash != null && splash.visibility == View.VISIBLE) {
            splash.animate()
                .alpha(0f)
                .setDuration(280)
                .withEndAction { splash.visibility = View.GONE }
                .start()
        }
    }

    fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "(function() { " +
                    "  var drawer = document.getElementById('akn-ui-drawer'); " +
                    "  var backdrop = document.getElementById('akn-ui-backdrop'); " +
                    "  if (drawer && drawer.classList.contains('open')) { " +
                    "    drawer.classList.remove('open'); " +
                    "    if (backdrop) backdrop.classList.remove('open'); " +
                    "    return true; " +
                    "  } " +
                    "  var crop = document.getElementById('background-editor'); " +
                    "  if (crop && crop.classList.contains('open')) { " +
                    "    crop.classList.remove('open'); " +
                    "    return true; " +
                    "  } " +
                    "  return false; " +
                    "})()"
                ) { result ->
                    if (result == "true") {
                        return@evaluateJavascript
                    }
                    val currentUrl = webView.url ?: ""
                    if (currentUrl.contains(GRADE_MARKER)) {
                        // 成绩页面按返回可以退出或回到登录页
                        finish()
                    } else if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        finish()
                    }
                }
            }
        })
    }

    override fun onDestroy() {
        audioPlayer.release()
        webView.destroy()
        super.onDestroy()
    }
}
