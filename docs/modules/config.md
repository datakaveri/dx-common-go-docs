---
id: config
title: config
---

# config — service configuration

```go
import "github.com/datakaveri/dx-common-go/config"
```

## Purpose

One loader for every service's configuration: YAML file (optional) + environment variables (override) + programmatic defaults, unmarshalled into your typed struct and validated before boot continues. It removes the per-service viper boilerplate and enforces a fleet-wide convention: **a malformed config file aborts boot; a missing one falls back to defaults + env.**

## When to use it

Always — every service loads configuration through `LoadService`. Define per-service structs that *embed* the shared blocks (`httpserver.Config`, `client.Config`, …) rather than redefining them.

## Key concepts

- **Layering** (later wins): programmatic `Defaults` → config file → environment variables.
- **Env mapping**: `.` becomes `_` — `server.port` binds `SERVER_PORT` (or `DX_SERVER_PORT` with `EnvPrefix: "DX"`).
- **Fail loud**: a present-but-unparseable file returns an error; only `viper.ConfigFileNotFoundError` is tolerated.
- **Validation hook**: if your config type implements `Validate() error`, it runs after unmarshal; a failure aborts boot.

## Public API

```go
type ServiceOptions struct {
    ConfigName string            // base file name, default "config"
    ConfigType string            // default "yaml"
    Paths      []string          // search dirs, default [".", "./configs", "/app/configs"]
    Defaults   map[string]any    // applied before file/env
    EnvPrefix  string            // "" = unprefixed env vars (fleet default)
}

func LoadService[T any](opts ServiceOptions) (*T, error)

type BaseConfig struct {          // optional embeddable common block
    LogLevel    string            `mapstructure:"log_level"`
    Server      httpserver.Config `mapstructure:"server"`
    AuthEnabled bool              `mapstructure:"auth_enabled"`
}
```

## Usage

```go
type Config struct {
    config.BaseConfig `mapstructure:",squash"`
    Postgres client.Config  `mapstructure:"postgres"`
    Auditing auditing.Config `mapstructure:"auditing"`
}

func (c *Config) Validate() error {
    if c.Postgres.DSN == "" {
        return errors.New("postgres.dsn is required")
    }
    return nil
}

cfg, err := config.LoadService[Config](config.ServiceOptions{
    Defaults: map[string]any{
        "server.port": 8080,
        "log_level":   "info",
    },
})
```

```yaml title="configs/config.yaml"
log_level: info
server:
  port: 8080
postgres:
  dsn: postgres://user:pass@localhost:5432/iudx_db
```

Override anything per environment: `SERVER_PORT=9090 POSTGRES_DSN=… ./service`.

## Best practices

- **Unprefixed env vars** are the fleet convention; reserve `EnvPrefix` for embedding multiple services in one process.
- Keep secrets out of files — deployment injects them as env vars (external-secrets → env → this loader). The library deliberately has no secret-manager client.
- Put every knob a deployer may touch in the YAML with a sane default; keep programmatic `Defaults` for values that are code-level concerns.

## Pitfalls

- Env binding only sees keys that exist via defaults or file. If a value has neither, add it to `Defaults` (even as `""`) so `AutomaticEnv` can bind it.
- `mapstructure:",squash"` is required when embedding `BaseConfig`, or its fields land under a `baseconfig` key.
- There is **no hot reload** by design — a config change is a rollout.

## Related modules

[httpserver](/modules/httpserver) (embeds its `Config`), every module with a `Config` struct.
