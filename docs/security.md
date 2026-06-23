# Security Notes

SkillPort 的默认安全模型：

- Token 不应明文写入 SQLite 或日志。
- Renderer 无 Node.js 能力，不直接接触文件系统。
- 所有外部 URL 使用系统浏览器打开。
- 下载内容必须先写入临时目录，再做 checksum 和 path traversal 校验。
- 安装和 Rule 应用需要先生成 plan，再执行写入。
- 后续真实写入能力必须包含 backup 与 audit log。

当前 MVP 使用演示数据服务和本地扫描，只暴露安全的白名单 IPC。
