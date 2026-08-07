# OmniRoute Windows 部署指南

本包是 OmniRoute 的 **Windows x64** 自包含构建产物（不捆绑 Node.js 运行时，本机需已有 Node.js）。

## 1. 环境要求

| 项目     | 要求                                                        |
| -------- | ----------------------------------------------------------- |
| 操作系统 | Windows x64                                                 |
| Node.js  | `>=22.22.2 <23` 或 `>=24.0.0 <27`（引擎约束，用 24.x 最佳） |
| nssm     | 可选（仅开机自启用，`scoop install nssm`）                  |

> 产物中的 `BUILD_INFO.txt` 记录了构建时的版本、commit、Node 版本。

## 2. 两个包的定位

| 包                                | 内容                             | 用途                                           | 端口  |
| --------------------------------- | -------------------------------- | ---------------------------------------------- | ----- |
| `omniroute-backend-win-x64.zip`   | 仅后端（`/v1/*` API，UI 已剥离） | **常驻**，保证代理随时可用；体积小、运行内存低 | 20128 |
| `omniroute-dashboard-win-x64.zip` | 完整应用（UI + API）             | **按需启动**，用于配置 providers / 策略        | 20129 |

两个实例共享**同一个数据目录**（SQLite WAL，多进程安全）。在仪表盘里改配置 → 后端即时生效，互不干扰。

## 3. 快速开始（前台运行，先验证）

```powershell
# 1) 解压 backend 包到，例如 C:\omniroute\backend
# 2) 建立共享数据目录（默认在 %APPDATA%\omniroute；也可自定义）
New-Item -ItemType Directory -Force -Path D:\omniroute-data

# 3) 放置最小化环境配置（用包内提供的 .env.minimal 为模板）
Copy-Item .env.minimal D:\omniroute-data\.env
notepad D:\omniroute-data\.env   # 必须修改 INITIAL_PASSWORD

# 4) 启动后端
cd C:\omniroute\backend
node dev\run-standalone.mjs

# 5) 另开窗口验证健康检查
.\verify-health.ps1              # 或：Invoke-RestMethod http://localhost:20128/api/monitoring/health
```

首次启动会自动生成 `JWT_SECRET`、`API_KEY_SECRET`、`STORAGE_ENCRYPTION_KEY` 并持久化到 `DATA_DIR\server.env`，无需手工生成。

## 4. 仪表盘（按需启动）

```powershell
cd C:\omniroute\dashboard
$env:DATA_DIR = "D:\omniroute-data"
$env:PORT = 20129
node dev\run-standalone.mjs
# 浏览器打开 http://localhost:20129 ，用 INITIAL_PASSWORD 登录
```

## 5. 开机自启（nssm）

包内 `nssm/` 目录已提供脚本（需先确认 `nssm` 在 PATH）：

```powershell
# 后端：常驻 + 开机自启
nssm\install-backend.cmd

# 仪表盘：手动服务（按需启停）
nssm\start-dashboard.cmd
nssm\stop-dashboard.cmd

# 卸载后端服务
nssm\uninstall-backend.cmd
```

脚本默认服务配置：

- `omniroute-backend`：`Start=SERVICE_AUTO_START`，进程退出自动重启，日志写 `DATA_DIR\logs\`。
- `omniroute-dashboard`：`Start=SERVICE_MANUAL`，手动启停。

> 脚本会通过 `where node` 自动定位 Node.exe。若 Node 未在 PATH，请编辑脚本里的 `NODE_EXE` 路径。
> 脚本内的 `DATA_DIR` 与 `PORT` 可自行修改后另存。

## 6. 内存与体积调优

后端默认按 `DATA_DIR\.env` 的 `.env.minimal` 模板运行，要点：

- `OMNIROUTE_MEMORY_MB=1024`：把 V8 堆上限压到 1GB（空闲常驻内存约 300-500MB）。
- `OMNIROUTE_DISABLE_BACKGROUND_SERVICES=true`：关闭约 12 个后台守护（定价同步、模型目录同步、备份调度、ELO、live-WS 等），**不影响 `/v1/*` 代理主链路**。
- `OMNIROUTE_DISABLE_CREDENTIAL_HEALTH_CHECK=true`：独立于主开关的凭据探活器，也一并关闭。
- 低内存缓存参数（`PROMPT_CACHE_MAX_SIZE` 等）限制内存缓存上限。
- `OMNIROUTE_ENABLE_LIVE_WS=false`：避免与另一实例争用 20132 端口。

> 后端包（构建时 `slim_backend=true`）已剪除 LLMLingua 可选压缩组件（`@atjsh/llmlingua-2` / `@huggingface/transformers` / `@tensorflow/tfjs`），体积更小；对应"上下文压缩 → LLMLingua"功能会自动降级为不启用，其余功能不受影响。如需要该功能，用 `slim_backend=false` 重新触发构建，或改跑完整包。

## 7. 网页登录类提供方（按需）

claude-web、duckduckgo-web 等基于浏览器，浏览器池**惰性启动**（不用不占资源）：

```powershell
cd C:\omniroute\backend
npx playwright install chromium
# 不需要重启；真正用到浏览器提供方时才拉起进程。不用时可卸载以省磁盘：
# Remove-Item -Recurse -Force $env:LOCALAPPDATA\ms-playwright
```

## 8. 升级

下载新版 zip → 解压到新目录 → 停旧服务/进程 → 替换目录（保留 `DATA_DIR` 不动）→ 启动。数据库迁移自动执行，幂等。

## 9. 常见问题

- **端口被占**：确认后端 20128、仪表盘 20129、live-WS 20132（已默认关闭）没有被占用：`netstat -ano | findstr 20128`。
- **健康检查失败**：先看 `DATA_DIR\logs\` 下后端日志；确认 `DATA_DIR\.env` 存在且语法正确。
- **better-sqlite3 报错**：说明原生模块与本机 Node 不匹配，请使用 Node 24.x（与产物构建版本一致）。
- **nssm 找不到**：`scoop install nssm` 或把 nssm.exe 所在目录加入 PATH。

## 10. 校验产物完整性

Release 附件附带 `SHA256SUMS.txt`，解压前先校验：

```powershell
Get-FileHash omniroute-backend-win-x64.zip -Algorithm SHA256
```
