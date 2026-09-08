# 粥粥FJNU成绩查询 (AKN FJNU Grades Tracker)

面向福建师范大学教务系统打造的轻量桌面与移动端查分客户端。告别老旧的原生网页体验，换上清新通透的毛玻璃 UI，支持自定义壁纸、动态视频与后台音乐播放，支持验证码自动识别。

[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Android-0078d7.svg)](https://github.com/Mikause/AKN-FJNU-Grades-Tracker)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

### 💡 开发初衷

学校教务系统不仅页面古老且操作繁琐，于是基于 Edge WebView2 与现代化 Web 技术打造了这个轻量客户端：保留官方登录与接口安全，同时重构视觉呈现——换上通透清爽的毛玻璃界面，内置支持播放本地音乐的悬浮播放器、自定义壁纸/动态视频背景，并在最新版本中引入了完全离线的本地验证码智能识别，让查分体验更优雅、省心。

---

## ✨ 功能亮点

- ⚡ **本地离线验证码秒级识别 (v1.2.0 新增)**：内置端侧轻量 ONNX 深度学习模型，验证码加载即在毫秒内完成自动提取与回填，彻底告别繁琐的手动输入；**100% 纯本地离线推理**，图像绝不经由任何第三方云端。
- 🎨 **毛玻璃风格与主题色自由调节**：看腻了默认色调？随时切换主题强调色（内置 7 款预设，也支持调色盘随意取色）；卡片模糊度（0~40px）、透明度和背景遮罩暗度都可以按喜好滑动调节，不怕浅色壁纸看不清字，所有设置会自动在本地保存。
- ⌨️ **随手可用的功能按键与快捷键**：登录页右下角与成绩查询页顶部都设有直观的「🎨 自定义 UI」按键，支持按 `Ctrl + U` 或 `F4` 瞬间唤出设置抽屉，调完按 `Esc` 即可关闭。
- 🖼️ **自定义壁纸与动态视频**：登录页和成绩页都能一键导入本地 JPG / PNG / WebP 图片，内置支持自由拖拽和缩放的裁切框；也可以直接使用 MP4 / WebM / OGG 动态视频作为背景，随时切换或一键恢复默认。
- 🎵 **跨页面不中断的背景音乐**：内置默认背景音乐《秋绪》，采用 Windows 原生 MCI 底层驱动以独立线程播放，在页面刷新或跳转时**音乐绝不中断**；支持导入本地 MP3、随机播放、音量调节与状态记忆。
- 📊 **学期成绩一键查询**：选好学年学期一键查询全部成绩，自动统计总课程数、通过门数与挂科/缺考情况，直观分页展示每门课程的成绩、绩点与考核方式。

---

## 📷 界面预览

#### 1. 登录界面与自定义背景/音乐播放器
<p align="center">
  <img src="assets/Demo.png" alt="登录与背景设置" width="850" />
</p>

#### 2. 我的课程成绩与数据统计看板
<p align="center">
  <img src="assets/Demo2.png" alt="成绩查询与看板" width="850" />
</p>

---

## 🔒 安全性与隐私深度声明 (Security & Privacy)

作为一款涉及学号与教务密码的查询工具，**安全性与隐私保护是本项目设计的第一基石**。我们郑重作出以下技术阐明：

### 1. 验证码智能识别：100% 离线本地推理，严守零云端中转底线
* **纯端侧推理**：软件内置 ONNX Runtime 离线推理引擎，验证码图片直接在本地内存完成预处理与神经网络前向推理。
* **零外网交互**：验证码数据既不上传至任何云服务，也不调用任何第三方公网打码平台，杜绝会话劫持与数据泄漏风险。

### 2. 密钥与密码：Windows DPAPI 系统级底层加密，严格仅保存在本地
* **拒绝明文保存**：软件绝不会在任何配置文件、文本文件或注册表里以明文保存学号与密码。
* **操作系统原生绑定加密**：软件调用 Windows 原生底层安全接口 **DPAPI**（`CryptProtectData` / `CryptUnprotectData`），直接以**当前 Windows 登录用户的会话凭据**派生加密密钥：
  * **无法被跨机盗取**：即使有人直接复制了本地的 `credentials.dat`，在其他电脑甚至当前电脑的其他 Windows 账户下均**完全无法解密**。
  * **无硬编码密钥**：代码中不存在任何固定密钥或盐值，彻底规避逆向脱壳风险。
* **随时物理清除**：仅在用户主动勾选“记住账号和密码”时才会加密写入本地 `%LOCALAPPDATA%\FJNUGradeViewer\credentials.dat`；取消勾选或登出即自动彻底物理删除。

### 3. 零联机数据收集：不设中间服务器，零遥测、零埋点
* **纯正本地客户端**：本软件不包含任何日志上传、遥测分析（Telemetry）、用户打点或追踪代码。
* **全链路直连学校官方**：所有网络请求（登录鉴权、成绩查询），**100% 直连福建师范大学官方教务系统（`jwglxt.fjnu.edu.cn`）**。
* **私密沙盒运行**：底层浏览器基于 Edge WebView2 的**私密模式（InPrivate Mode）**启动，关闭即自动销毁本次会话的临时缓存与 Cookie。

---

## 🚀 下载与版本选择 (Releases)

前往 [Releases](../../releases) 页面即可直接下载打包好的单文件版本，开箱即用：

> **⚠️ 版本体积说明**：由于 v1.2.0 引入了端侧深度学习 ONNX 模型（`common.onnx` 约 13.6 MB）与算子库，**AI 智能识别版安装包体积会显著增大**。用户可按需选择最适合的版本：

### 💻 Windows 平台

| 版本类型 | 建议选用人群 | 体积 | 特性说明 |
| :--- | :--- | :--- | :--- |
| **🤖 AI 智能识别版** | 懒得手动输验证码的用户 (**推荐**) | ~54 MB | 内置 ONNX Runtime，全自动提取并秒填验证码。 |
| **🪶 标准轻量版** | 追求极致小体积、低存储占用的用户 | ~18 MB | 极简纯净，不包含 AI 算子库，需手动输入验证码。 |

* 编译产物包含：
  * `AKN-FJNU-Grades-Tracker_AI_OCR.exe`（64位首选）
  * `AKN-FJNU-Grades-Tracker_AI_OCR_Universal.exe`（自适应通用版）
  * `AKN-FJNU-Grades-Tracker_Standard.exe`（轻量64位）
  * `AKN-FJNU-Grades-Tracker_Standard_Universal.exe`（轻量通用版）

### 📱 Android 平台

| 安装包名称 | 体积 | 特性说明 |
| :--- | :--- | :--- |
| **`AKN-FJNU-Grades-Tracker_AI_OCR.apk`** | ~86 MB | **手机端推荐**。内置移动端 ONNX Runtime，验证码自动识别回填。 |
| **`AKN-FJNU-Grades-Tracker_Standard.apk`** | ~11 MB | 极致轻巧，适合追求轻量无额外依赖的用户。 |

---

## 📝 更新日志 (Release Notes)

### v1.2.0
* **[新增] 端侧 ONNX 离线验证码智能识别**：
  * 引入轻量级 CTC ONNX 深度学习模型，验证码秒级识别并自动填入。
  * 100% 离线端侧推理，不使用任何外部网络，严格保护隐私安全。
* **[架构] 双版本分发机制**：
  * 同步推出 **AI 智能识别版** 与 **标准轻量版**。
  * Android 端采用 Gradle Product Flavors 架构，标准版与 AI 版完全隔离，标准版体积保持在 ~11MB 的极致水平。
* **[优化] 交互与细节修复**：
  * 优化验证码点击刷新时的二次识别连贯性。
  * 完善 Windows 与 Android 端的双向桥接垫片与防混淆配置。

---

## 🛠️ 源码运行与多版本构建

### 1. 环境准备
确保已安装 Python 3.11 或更高版本，然后安装依赖：

```powershell
pip install -r requirements.txt
```

### 2. 源码调试运行
```powershell
python grade_viewer.py
```

### 3. 一键打包 Windows 版本
通过 PowerShell 脚本自由构建目标版本与架构：

```powershell
# 一键打包全部版本 (同时生成标准版与 AI 识别版)
.\build.ps1 -Edition all

# 仅构建标准轻量版
.\build.ps1 -Edition standard

# 仅构建 AI 智能识别版
.\build.ps1 -Edition ai

# 仅构建指定架构 (例如 x64 或 universal)
.\build.ps1 -Edition all -Arch x64
```

---

## 📁 项目结构

```text
android/                 # Android 原生工程 (Kotlin / WebView 容器)
  app/src/main/          # 通用业务逻辑与界面
  app/src/standard/      # 标准轻量版专属代码
  app/src/ocr/           # ONNX 识别引擎实现
assets/                  # 静态资源与页面脚本
  ocr/                   # ONNX 模型权重 (common.onnx) 与字典 (charset.json)
  app-icon.ico           # 应用图标
  default-bgm.mp3        # 默认背景音乐（《秋绪》）
  fjnu-logo.jpg          # 校徽素材
  login-background.webp  # 默认登录背景图
  login-helper.js        # 登录页重构、验证码自动识别回填
  loading-helper.js      # 页面跳转过渡动画
  player-helper.js       # 悬浮音乐播放器组件
  ui-helper.js           # 自定义 UI 面板与动态主题引擎
  grade-helper.js        # 成绩数据异步请求与分页看板
build.ps1                # Windows 多版本自动化打包脚本
grade_viewer.py          # 主程序核心逻辑
requirements.txt         # 运行与打包依赖
```

---

## ⚠️ 免责声明

1. 本项目为开源爱好者独立开发的第三方工具，仅供福建师范大学在校师生学习交流与个人查分便利使用，**非官方产品**。
2. 软件内的账号密码仅用于向学校官方教务系统发起认证，绝不会上传或转存至任何第三方。
3. 若学校教务系统后续调整网页结构或接口，可能会影响部分功能适配，欢迎提交 Issue 或 Pull Request。

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源。
