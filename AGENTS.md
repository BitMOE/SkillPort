# AGENTS.md — Codex 项目规则

本文件用于约束 Codex 在本仓库内进行功能迭代、修复缺陷、重构和日常维护时的默认行为。除非用户在当前任务中明确覆盖，否则必须遵守以下规则。

## 1. 基本原则

- 优先交付可运行、可测试、可维护的代码，不做与任务无关的大范围改动。
- 每次修改前先理解现有实现、目录结构、依赖关系和约定，不要凭空重写。
- 尊重用户和团队已有改动。发现工作区存在未提交改动时，必须先查看并避免覆盖。
- 不引入无关依赖、不提交临时调试代码、不留下明显 TODO，除非用户明确要求。
- 任何破坏性 Git 操作都必须先获得用户明确许可。

## 2. 开始任务前必须执行

在开始修改代码前，先执行并阅读结果：

```bash
git status --short
git branch --show-current
```

如果仓库有测试、构建或检查命令，应先确认可用命令，例如查看：

```bash
ls
find . -maxdepth 2 -iname "package.json" -o -iname "pyproject.toml" -o -iname "go.mod" -o -iname "Cargo.toml" -o -iname "pom.xml"
```

开始前需要做到：

- 明确本次迭代目标、影响范围、验收标准。
- 识别需要修改的模块、测试文件、配置文件和文档。
- 如果当前分支不适合直接开发，应创建任务分支，例如：

```bash
git checkout -b feature/<short-task-name>
```

不要在没有明确要求的情况下切换到其他已有分支。

## 3. 功能迭代流程

进行功能开发时遵循以下流程：

1. 阅读相关代码和测试，先定位最小修改范围。
2. 设计简洁实现方案，优先复用现有抽象和工具函数。
3. 编写或更新必要测试，覆盖核心路径、边界情况和回归风险。
4. 修改代码，保持提交粒度清晰。
5. 更新相关文档、配置、示例、迁移脚本或变更说明。
6. 运行格式化、静态检查、测试和构建命令。
7. 确认 `git diff` 只包含本次任务相关改动。
8. 必须提交代码，除非用户明确要求不要提交或环境不允许提交。

## 4. 测试和验证要求

提交前必须尽最大努力运行与本次改动相关的验证命令。

优先级如下：

1. 与被修改模块直接相关的单元测试或集成测试。
2. 项目约定的 lint、typecheck、format check。
3. 项目构建命令。
4. 必要的手动验证步骤。

常见命令示例：

```bash
npm test
npm run lint
npm run typecheck
npm run build

pytest
ruff check .
mypy .

pnpm test
pnpm lint
pnpm build

go test ./...

cargo test
```

如果某个命令不存在、依赖缺失、环境不支持或测试失败，必须在最终回复中说明：

- 执行了什么命令。
- 得到什么结果。
- 失败原因或阻塞点。
- 是否已经提交，以及提交中是否包含已知风险。

## 5. Git 提交要求

功能迭代完成后，必须提交本次改动。

提交前执行：

```bash
git status --short
git diff --stat
git diff
```

只添加与本次任务相关的文件：

```bash
git add <relevant-files>
```

提交信息使用 Conventional Commits 风格，按实际类型选择：

```bash
git commit -m "feat: add <short description>"
git commit -m "fix: resolve <short description>"
git commit -m "refactor: improve <short description>"
git commit -m "test: add coverage for <short description>"
git commit -m "docs: update <short description>"
```

提交后必须执行：

```bash
git status --short
git log -1 --oneline
```

最终回复中必须包含：

- 本次改动摘要。
- 已运行的验证命令及结果。
- Git commit hash 或 `git log -1 --oneline` 输出。
- 未解决问题、风险或后续建议。

## 6. 禁止或需确认的 Git 操作

没有用户明确许可，不得执行以下操作：

```bash
git push
git reset --hard
git clean -fd
git checkout -- <file>
git restore <file>
git rebase
git commit --amend
git cherry-pick
git revert
git merge
```

尤其注意：

- 不要覆盖、删除或回滚用户已有改动。
- 不要擅自推送远端分支。
- 不要擅自改写历史。
- 不要把密钥、令牌、`.env`、本地配置、日志、缓存、构建产物提交进仓库，除非仓库明确要求。

## 7. 代码质量要求

所有功能迭代都必须满足：

- 代码风格与现有项目一致。
- 命名清晰，避免过度抽象。
- 保持向后兼容，除非用户明确要求破坏性变更。
- 错误处理明确，不吞异常，不隐藏失败。
- 对外接口、配置项、环境变量和数据库变更必须有文档或注释说明。
- 涉及数据结构、API、数据库 schema、权限、鉴权、计费、异步任务时，必须考虑迁移和回滚风险。
- 新增依赖前必须确认必要性，并优先使用项目已有依赖。

## 8. 安全和隐私要求

- 不要提交任何真实密钥、token、cookie、证书、私有 URL 或个人敏感信息。
- 不要在日志中输出敏感信息。
- 涉及认证、授权、支付、上传、下载、命令执行、SQL、文件路径、SSRF、XSS、CSRF 等逻辑时，必须进行安全边界检查。
- 对用户输入、外部 API 返回值和文件内容保持不信任，必须校验和限制。

## 9. 文档和变更说明

以下情况必须更新文档或注释：

- 新增或修改公开 API。
- 新增配置项、环境变量、命令行参数。
- 修改部署、构建、测试或迁移流程。
- 修改用户可见行为。
- 引入重要限制、兼容性说明或已知问题。

优先更新：

- README.md
- docs/
- CHANGELOG.md
- 示例配置文件
- 相关模块注释或类型说明

## 10. 最终回复格式

完成任务后，使用以下格式回复用户：

```markdown
完成：
- <改动 1>
- <改动 2>

验证：
- `<command>`：通过
- `<command>`：失败，原因是 <reason>

提交：
- `<commit hash> <commit message>`

备注：
- <风险、限制或后续建议；没有则写“无”>
```

如果由于权限、环境、冲突、测试失败或用户要求导致无法提交，必须明确说明“未提交”，并给出具体原因和下一步建议。
