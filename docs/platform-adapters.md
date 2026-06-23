# Platform Adapters

平台目录、Rule 目标、安装模式与扫描行为由 YAML 配置描述，业务逻辑不硬编码平台路径。

内置配置位于：

```text
adapters/platforms/builtin.yaml
```

每个平台至少包含：

- `skills.user.defaultPath`
- `skills.project.defaultPath`
- `rules`
- `install.defaultMode`
- `install.allowSymlink`
- `install.fallbackMode`
- `scan.patterns`

后续可以把该 YAML 载入数据库或用户配置目录，支持团队覆盖默认 adapter。
