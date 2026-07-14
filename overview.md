# WorkBuddy 记忆跨电脑同步 — 设置概览

## 背景
用户有两台工作电脑，通过百度云盘共享 WorkBuddy 记忆。

## 同步机制

### 1. 项目工作区记忆（Layer 3）— 目录联接 ✅
- **原路径**: `D:\_Careate.Program\calculator-site\.workbuddy\memory\`
- **同步路径**: `BaiduSyncdisk\_workbuddy-sync\projects\calculator-site\`
- **机制**: Windows Directory Junction，无需 admin
- **效果**: 读写直接映射，百度云盘自动同步，无需手动操作

### 2. 用户级记忆（Layer 2）— 手动触发 ✅
- **本地路径**: `~/.workbuddy/MEMORY.md`
- **同步路径**: `BaiduSyncdisk\_workbuddy-sync\MEMORY.md`
- **机制**: 用户对 WorkBuddy 说 **"同步记忆"** → 运行 `sync-user-memory.ps1` 双向同步
- **规则**: 较新文件覆盖较旧文件

### 3. Layer 1 云端记忆 — 天然共享
- 服务端 profile + conversation_search 自动跨电脑，无需设置

## 同步目录结构
```
BaiduSyncdisk\_workbuddy-sync\
├── MEMORY.md                          ← 用户级记忆
├── skills\                            ← 用户级技能
├── _backup\                           ← 备份
├── scripts\
│   ├── sync-user-memory.ps1           ← 用户记忆同步脚本（手动触发）
│   └── setup-workbuddy-sync.ps1       ← 另一台电脑的设置脚本
└── projects\
    └── calculator-site\               ← 本项目工作区记忆
        ├── 2026-07-04.md
        ├── 2026-07-09.md
        └── MEMORY.md
```

## 另一台电脑设置
1. 确保百度云盘已同步 `_workbuddy-sync` 文件夹
2. 右键运行 `_workbuddy-sync\scripts\setup-workbuddy-sync.ps1`
3. 脚本自动创建目录联接 + 初始同步

## 使用方式
- 项目工作区记忆：**自动同步**（联接透明工作）
- 用户级记忆：对 WorkBuddy 说 **"同步记忆"** 即可
