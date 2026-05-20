# Git Profile Switcher — v0.1.0-alpha (MVP)

一键切换本机 Git 身份（user.name / user.email / signingkey / SSH key 关联等）的桌面 GUI 工具。

> 当前版本对应方案文档 Milestone 1：Profile CRUD + 全局切换 + 首次启动向导 + 备份/历史。

## 功能（v0.1.0-alpha）

- 首次启动向导：扫描本机 `~/.gitconfig` / `~/.ssh/` / `~/.ssh/config` / `gpg --list-secret-keys`，以及常见目录下仓库的 `.git/config`，建议导入为 profile
- Profile CRUD（名称、图标、user.name、user.email、signingkey、gpgsign、defaultBranch、SSH key 路径）
- 全局切换（写入 `git config --global`），切换前自动备份 `~/.gitconfig`
- 仪表盘：当前 `git config` 快照 + 快速切换 + 最近活动
- 历史：切换记录与备份恢复

> 尚未实现：仓库级切换、SSH config 改写、GPG key 生成、系统托盘、全局快捷键、i18n、主题切换。

## 环境依赖

- Node.js 20+
- Rust 1.75+（`rustup` 安装）
- 已安装 `git` 命令
- macOS / Linux 系统级依赖参考 [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/)

如果尚未安装 Rust：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 启动开发

```bash
# 1. 安装前端依赖
npm install

# 2. 运行 Tauri dev（会自动启动 Vite + 编译 Rust）
npm run tauri:dev
```

首次启动 Rust 会下载并编译 Tauri 相关 crate，需要几分钟。

## 打包

```bash
npm run tauri:build
```

产物位于 `src-tauri/target/release/bundle/`。

## 数据位置

- macOS：`~/Library/Application Support/com.kingsley.gitprofileswitcher/`
- Linux：`~/.config/com.kingsley.gitprofileswitcher/`
- Windows：`%APPDATA%\com.kingsley.gitprofileswitcher\`

包含 `profiles.json` / `history.json` / `flags.json` / `backups/`。

## 目录结构（已实现部分）

```
git-profile-switcher/
├── src/                         前端
│   ├── pages/                   Dashboard / ProfileList / ProfileEditor /
│   │                            FirstRunWizard / History / Settings
│   ├── components/Sidebar.tsx
│   ├── store/profileStore.ts
│   ├── lib/{tauri,utils}.ts
│   └── types/index.ts
└── src-tauri/                   Rust 后端
    └── src/
        ├── commands/            invoke 命令：profile / switch / scan / backup / history
        └── core/                业务逻辑：profile / store / git_config /
                                 ssh_config / switcher / scan / backup / error
```

## 已知限制

- 占位图标为 1x1 简化 PNG，正式打包前需替换 `src-tauri/icons/`
- `Cargo.lock` 未提交（首次 build 自动生成）
- 切换 SSH key 当前仅记录到 profile，尚未自动改写 `~/.ssh/config`（Milestone 2）
