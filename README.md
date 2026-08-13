# 猪猪成绩查询

面向福建师范大学教务系统的Windows桌面成绩查询客户端。

## 功能

- 使用学校教务系统账号、密码和验证码登录。
- 登录后保持窗口可见，并在原登录按钮位置显示加载状态。
- 登录页可选择本地 JPG、PNG 或 WebP 图片，自由拖动和缩放后裁切为窗口背景。
- 查看课程成绩、学分、绩点、考核方式及通过情况。
- 按学年、学期和课程标记使用官方条件重新查询。
- 一次获取当前筛选条件下的全部成绩，并在软件内按每页 15 门分页展示。
- 可选记住账号和密码，凭据通过 Windows DPAPI 加密。

## 运行

下载 Release 中的 `猪猪成绩查询.exe` 后直接运行。EXE 已包含 Python、`requirements.txt` 中的全部运行依赖和项目静态资源，不需要用户安装 Python 或执行 `pip install`。

程序支持 Windows 10/11 64 位。大多数设备已自带 Microsoft Edge WebView2 Runtime；极少数精简系统若缺少该微软组件，程序会询问是否从微软官网下载并自动安装。WebView2 属于微软系统运行时，不能作为 Python requirement 直接嵌入 EXE。

## 从源码构建

需要 Windows、Python 3.11 或更高版本，以及 Microsoft Edge WebView2 Runtime。

```powershell
python -m pip install -r requirements.txt
.\build.ps1
```

构建结果位于：

```text
dist\猪猪成绩查询.exe
dist\FJNU-Grade-Viewer-Windows-x64.zip
```

构建脚本会清理旧的 `build`、`dist` 和 PyInstaller spec 文件。

仓库也包含 GitHub Actions 工作流。推送 `v*` 标签或在 Actions 页面手动运行后，会生成 Windows EXE artifact。

## 隐私

- 程序仅加载 `jwglxt.fjnu.edu.cn` 官方页面。
- 验证码、Cookie 和网页会话不会写入项目目录。
- 只有勾选“记住账号和密码”时才会保存凭据。
- 凭据保存在当前 Windows 用户的本地应用数据目录，并使用 Windows DPAPI 加密。
- 自定义背景只保存裁切后的 JPEG，不复制原始图片，保存为 `%LOCALAPPDATA%\FJNUGradeViewer\custom-background.jpg`。
- 程序使用 WebView2 私密模式，关闭后会清除网页会话。

## 项目结构

```text
assets/
  app-icon.ico
  fjnu-logo.jpg
  login-background.png
  login-helper.js
  loading-helper.js
  grade-helper.js
build.ps1
grade_viewer.py
requirements.txt
```

## 说明

本项目不是福建师范大学官方软件。教务系统页面结构变更后，页面适配代码可能需要同步更新。
