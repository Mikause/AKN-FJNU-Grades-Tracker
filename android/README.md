# 粥粥FJNU成绩查询 - Android 客户端

本目录是「粥粥FJNU成绩查询」的原生 Android (Kotlin) 客户端外壳工程。

### 📱 架构与技术亮点
- **极简容器**：基于 Android 原生 WebView 渲染福建师范大学教务系统。
- **完整复用**：复用主项目的 ssets/ 静态资源（毛玻璃质感、主题色自由调节、悬浮音乐播放器、自定义背景）。
- **原生接口替代**：
  - **密码安全加密**：基于 Android 原生 EncryptedSharedPreferences（Keystore 硬件级隔离）。
  - **常驻背景音乐**：基于 Android 原生 MediaPlayer，页面跳转或刷新音乐绝不中断。
  - **相册选择**：支持直接从安卓系统相册选择图片或视频作为背景。

### 🛠️ 本地编译与运行
1. 使用 **Android Studio** 打开当前 ndroid/ 文件夹。
2. 等待 Gradle 自动完成依赖同步。
3. 连接安卓手机（开启 USB 调试）或 Android 模拟器，点击运行即可。

### ☁️ 云端自动构建 APK
仓库已配置 GitHub Actions 自动化工作流 (.github/workflows/android.yml)：
- 推送至 GitHub 后，可在 Actions 页面一键触发构建或自动生成 Debug APK。
- 发布带 * 标签的 Release 时，自动编译生成 粥粥FJNU成绩查询_Android.apk 并添加至发布资产。
