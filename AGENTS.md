# AGENTS.md — calc-tools.top 项目编码规则

## UTF-8 编码规则（严禁违反）

1. **所有 HTML 文件必须使用 UTF-8 编码保存**，不得使用 ANSI/GBK/GB2312
2. **在 PowerShell 中写入文件时**，必须显式指定 `-Encoding UTF8`，例如：
   ```powershell
   Set-Content -Path file.html -Value $content -Encoding UTF8
   ```
3. **读取文件时**，始终使用 `-Encoding UTF8`：
   ```powershell
   Get-Content -Path file.html -Encoding UTF8
   ```
4. **使用 `apply_patch` 工具时**，补丁内容不得包含非 ASCII 字符的编码损坏

## 编码损坏检查

- 如果文件内容中出现 `�`（U+FFFD 替换字符），说明编码已损坏
- 运行 `.\scripts\validate-encoding.ps1` 检查全站编码
- 此脚本也会在 pre-commit hook 中自动运行，阻止损坏的文件提交

## Git pre-commit hook

- Hook 文件位于 `.githooks/pre-commit`
- 由 `git config core.hooksPath .githooks` 启用
- 若有 `.html` 文件包含 U+FFFD 则阻止提交

## 部署前检查

推送部署前建议运行：
```powershell
.\scripts\validate-encoding.ps1
```
