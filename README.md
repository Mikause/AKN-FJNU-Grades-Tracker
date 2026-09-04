# 粥粥FJNU成绩查询 (AKN FJNU Grades Tracker)

面向福建师范大学教务系统打造的轻量桌面查分客户端。告别老旧的原生网页体验，换上清新通透的毛玻璃 UI，支持自定义壁纸、动态视频与后台音乐播放。

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d7.svg)](https://microsoft.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 💡 开发初衷

学校教务系统不仅页面古老且操作繁琐，于是便在Antigravity的帮助下基于EdgeWebView2做了这个轻量桌面工具：保留了官方登录与接口安全，同时重构了视觉呈现——换上清爽的毛玻璃界面，顺便塞入了一个支持播放本地音乐的悬浮播放器和自定义壁纸裁切器，让查分体验变得更加舒适。

---

## ✨ 功能亮点

- 🎨 **现代化毛玻璃 UI**：深度接管官方页面渲染，通透的玻璃拟态质感、细腻的动态流光与自适应布局，告别原版页面的杂乱。
- 🖼️ **自定义壁纸与动态视频**：登录页可一键导入本地 JPG / PNG / WebP 图片，内置支持缩放和自由拖拽的画布裁切器；同时支持直接加载 MP4 / WebM / OGG 动态视频作为动态壁纸。
- 🎵 **跨页面常驻背景音乐**：内置默认背景音乐《秋绪》，采用 Windows 原生 MCI 底层驱动，独立线程运行（页面刷新跳转过程中**音乐绝不中断**）；支持导入本地 MP3、随机播放、音量调节与状态记忆。
- 📊 **学期成绩一网打尽**：按学年、学期及课程类别一键查询全部成绩，自动统计总课程数、通过门数与挂科/缺考情况，直观分页展示每门课程的成绩、绩点与考核方式。

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

### 1. 密钥与密码：Windows DPAPI 系统级底层加密，严格仅保存在本地
* **拒绝明文保存**：软件绝不会在任何配置文件、文本文件或注册表里以明文保存你的学号与密码。
* **操作系统原生绑定加密**：软件调用 Windows 原生底层安全接口 **DPAPI**（`CryptProtectData` / `CryptUnprotectData`）。该加密方案由 Windows 操作系统核心维护，直接以**当前 Windows 登录用户的会话凭据**派生加密密钥：
  * **无法被跨机盗取**：即使有人直接复制拷贝了你电脑上的 `credentials.dat` 文件，在其他电脑、甚至当前电脑的其他 Windows 账户下，由于缺失当前系统用户的登录会话凭据，**完全无法解密**。
  * **无任何硬编码密钥**：代码中不存在任何内置固定密钥（Hardcoded Key）或盐值，彻底规避逆向脱壳提取密钥的风险。
* **随时彻底清除**：仅在用户主动勾选“记住账号和密码”时才会加密写入本地 `%LOCALAPPDATA%\FJNUGradeViewer\credentials.dat`；只要不勾选或重新登录，软件会自动即时物理删除该凭据文件。

### 2. 零联机数据收集：不设任何中间服务器，零遥测、零埋点
* **纯正本地客户端**：本软件不包含任何用于收集日志、遥测分析（Telemetry）、用户打点或追踪行为的代码或第三方 SDK。
* **全链路直连学校官方**：软件发起的所有网络请求（包括验证码拉取、登录认证鉴权、成绩异步查询），**100% 直连福建师范大学官方教务系统（`jwglxt.fjnu.edu.cn`）**，不存在任何中转云服务器、代理服务或中间商。
* **私密沙盒运行**：底层浏览器基于 Edge WebView2 的**私密模式（InPrivate Mode）**启动，软件关闭即自动销毁本次会话产生的临时缓存、网页记录与 Cookie，不占用常驻磁盘，杜绝网页留痕。
* **代码完全开源透明**：本项目核心逻辑仅数百行，所有网络交互与本地存储逻辑公开透明，欢迎随时查阅源码或使用抓包工具（如 Fiddler、Wireshark）进行安全审计。

---

## 🚀 下载与版本选择

前往 [Releases](../../releases) 页面即可直接下载打包好的单文件版本，开箱即用（无需配置 Python 环境）：

| 版本 | 文件名 | 适用场景说明 |
| :--- | :--- | :--- |
| **🌟 Universal 通用版** | `粥粥FJNU成绩查询_Universal.exe` | **推荐所有人首选**。内置智能架构探测引擎，自适应 32 位与 64 位 Windows 系统，无需纠结电脑位数，直接双击运行。 |
| **⚡ 64位专版** | `粥粥FJNU成绩查询_x64.exe` | 针对 64 位 Windows 10 / 11 深度优化，单文件体积更小（~18 MB），冷启动性能最高。 |
| **🛡️ 32位兼容版** | `粥粥FJNU成绩查询_x86.exe` | 专为 32 位老旧系统、老机型或精简测试环境打造，兼具最大化兼容性。 |

> **提示**：现代 Windows 10/11 系统通常已自带 Microsoft Edge WebView2 运行时；若极少数精简版系统检测到缺失，软件启动时会自动提示一键从微软官方下载安装。

---

## 🛠️ 源码运行与多架构构建

如果你想自行调试或构建特定架构的安装包：

### 1. 环境准备
确保已安装 Python 3.11 或更高版本，然后安装基础依赖：

```powershell
pip install -r requirements.txt
```

### 2. 源码调试运行
```powershell
python grade_viewer.py
```

### 3. 多架构一键打包 EXE
项目内置强大的 PowerShell 自动化构建脚本，支持自由构建目标架构：

```powershell
# 一键构建全套版本 (x64、x86、Universal)
.\build.ps1

# 仅构建 64 位专版
.\build.ps1 -Arch x64

# 仅构建 32 位兼容版 (需本地配置 32 位 Python)
.\build.ps1 -Arch x86

# 仅打包 Universal 双架构通用版
.\build.ps1 -Arch universal
```

构建完成后，所有单文件可执行程序均输出在 `dist\` 目录下：
* `dist\粥粥FJNU成绩查询_Universal.exe` (自适应通用版)
* `dist\粥粥FJNU成绩查询_x64.exe` (64位原生版)
* `dist\粥粥FJNU成绩查询_x86.exe` (32位兼容版)

---

## 📁 项目结构

```text
assets/                  # 静态资源与页面注入脚本
  app-icon.ico           # 应用图标
  default-bgm.mp3        # 默认背景音乐（《秋绪》）
  fjnu-logo.jpg          # 校徽素材
  login-background.webp  # 默认登录背景图
  login-helper.js        # 登录页重构、壁纸裁切与视频背景逻辑
  loading-helper.js      # 页面跳转过渡动画
  player-helper.js       # 悬浮音乐播放器组件
  grade-helper.js        # 成绩数据异步请求与分页看板
build.ps1                # 自动化打包脚本
grade_viewer.py          # 主程序核心逻辑
requirements.txt         # 核心运行依赖
```

---

## ⚠️ 免责声明

1. 本项目为开源爱好者独立开发的第三方工具，仅供福建师范大学在校师生学习交流与个人查分便利使用，**非官方产品**。
2. 软件内的账号密码仅用于向学校官方教务系统发起认证，绝不会上传或转存至任何第三方。
3. 若学校教务系统后续调整网页结构或接口，可能会影响部分功能适配，欢迎提交 Issue 或 Pull Request。

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 开源。
