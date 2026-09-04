[CmdletBinding()]
param(
    [ValidateSet('all', 'x64', 'x86', 'universal')]
    [string]$Arch = 'all'
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$buildDirectory = Join-Path $projectRoot 'build'
$distDirectory = Join-Path $projectRoot 'dist'
$pythonCacheDirectory = Join-Path $projectRoot '__pycache__'
$appName = '粥粥FJNU成绩查询'

Push-Location -LiteralPath $projectRoot
try {
    if (-not (Test-Path -LiteralPath $distDirectory)) {
        New-Item -ItemType Directory -Path $distDirectory | Out-Null
    }

    $commonArgs = @(
        '--noconfirm',
        '--clean',
        '--onefile',
        '--windowed',
        '--icon', 'assets\app-icon.ico',
        '--add-data', 'assets\fjnu-logo.jpg;assets',
        '--add-data', 'assets\login-background.webp;assets',
        '--add-data', 'assets\login-helper.js;assets',
        '--add-data', 'assets\loading-helper.js;assets',
        '--add-data', 'assets\grade-helper.js;assets',
        '--add-data', 'assets\player-helper.js;assets',
        '--add-data', 'assets\default-bgm.mp3;assets',
        '--exclude-module', 'tkinter',
        '--exclude-module', 'unittest',
        '--exclude-module', 'IPython',
        '--exclude-module', 'pytest',
        '--exclude-module', 'sqlite3',
        '--exclude-module', 'pydoc',
        '--exclude-module', 'xmlrpc',
        '--exclude-module', 'pdb',
        '--exclude-module', 'test',
        '--exclude-module', 'multiprocessing',
        'grade_viewer.py'
    )

    # 1. 构建 x64 版本
    if ($Arch -in @('all', 'x64', 'universal')) {
        Write-Host "==> 正在构建 x64 版本..." -ForegroundColor Cyan
        python -m PyInstaller @commonArgs --name ($appName + '_x64')
        Copy-Item (Join-Path $distDirectory ($appName + '_x64.exe')) (Join-Path $distDirectory ($appName + '.exe')) -Force
    }

    # 2. 构建 x86 版本
    $python32 = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311-32\python.exe'
    if (-not (Test-Path -LiteralPath $python32)) {
        $pyCheck = Get-Command python -ErrorAction SilentlyContinue
        if ($pyCheck) {
            $is32 = & python -c "import struct; print(struct.calcsize('P') == 4)" 2>$null
            if ($is32 -eq 'True') {
                $python32 = $pyCheck.Source
            }
        }
    }
    if ($Arch -in @('all', 'x86', 'universal')) {
        if (Test-Path -LiteralPath $python32) {
            Write-Host "==> 正在构建 x86 版本..." -ForegroundColor Cyan
            & $python32 -m PyInstaller @commonArgs --name ($appName + '_x86')
        } else {
            Write-Warning "未检测到 32 位 Python，跳过 x86 构建。"
        }
    }

    # 3. 构建 Universal 通用版 (AnyCPU 智能双架构自适应)
    if ($Arch -in @('all', 'universal')) {
        $x64Exe = Join-Path $distDirectory ($appName + '_x64.exe')
        $x86Exe = Join-Path $distDirectory ($appName + '_x86.exe')
        $cscPath = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'

        if ((Test-Path -LiteralPath $x64Exe) -and (Test-Path -LiteralPath $x86Exe) -and (Test-Path -LiteralPath $cscPath)) {
            Write-Host "==> 正在生成 Universal 双架构通用版..." -ForegroundColor Cyan
            $launcherCs = Join-Path $projectRoot 'universal_launcher.tmp.cs'
            $source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

namespace AknGradesTracker
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                bool is64 = Environment.Is64BitOperatingSystem;
                string arch = is64 ? "x64" : "x86";
                string resName = is64 ? "payload_x64" : "payload_x86";

                string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string targetDir = Path.Combine(appData, "FJNUGradeViewer", "universal", arch);
                Directory.CreateDirectory(targetDir);
                string targetExe = Path.Combine(targetDir, "粥粥FJNU成绩查询.exe");

                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream(resName))
                {
                    if (stream != null)
                    {
                        bool extract = !File.Exists(targetExe) || new FileInfo(targetExe).Length != stream.Length;
                        if (extract)
                        {
                            string tempFile = targetExe + ".tmp";
                            using (FileStream fs = new FileStream(tempFile, FileMode.Create, FileAccess.Write, FileShare.None))
                            {
                                byte[] buffer = new byte[65536];
                                int read;
                                while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                                {
                                    fs.Write(buffer, 0, read);
                                }
                            }
                            if (File.Exists(targetExe))
                            {
                                try { File.Delete(targetExe); } catch { }
                            }
                            File.Move(tempFile, targetExe);
                        }
                    }
                }

                if (!File.Exists(targetExe))
                {
                    MessageBox.Show("未能提取核心运行库，请重试。", "粥粥FJNU成绩查询", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo(targetExe);
                psi.Arguments = args != null && args.Length > 0 ? string.Join(" ", args) : "";
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("启动失败: " + ex.Message, "粥粥FJNU成绩查询", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
'@
            [System.IO.File]::WriteAllText($launcherCs, $source, [System.Text.Encoding]::UTF8)
            $universalExe = Join-Path $distDirectory ($appName + '_Universal.exe')
            & $cscPath /nologo /target:winexe /platform:anycpu /win32icon:"assets\app-icon.ico" `
                "/resource:$x64Exe,payload_x64" `
                "/resource:$x86Exe,payload_x86" `
                "/out:$universalExe" `
                $launcherCs
            Remove-Item -LiteralPath $launcherCs -Force -ErrorAction SilentlyContinue
            Write-Host ("Universal 构建完成: " + $universalExe) -ForegroundColor Green
        }
    }

    # 清理构建中间文件
    Get-ChildItem -LiteralPath $projectRoot -Filter '*.spec' -File | Remove-Item -Force
    if (Test-Path -LiteralPath $buildDirectory) {
        Remove-Item -LiteralPath $buildDirectory -Recurse -Force
    }
    if (Test-Path -LiteralPath $pythonCacheDirectory) {
        Remove-Item -LiteralPath $pythonCacheDirectory -Recurse -Force
    }

    Write-Host "构建结束，输出文件位于 dist/ 目录：" -ForegroundColor Green
    Get-ChildItem -LiteralPath $distDirectory -Filter '*.exe' | ForEach-Object {
        Write-Host ("  - " + $_.Name + " (" + [math]::Round($_.Length / 1MB, 2) + " MB)")
    }
}
finally {
    Pop-Location
}
