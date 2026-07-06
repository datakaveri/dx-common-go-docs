---
id: scheduler
title: scheduler
---

# scheduler — in-process interval jobs

```go
import "github.com/datakaveri/dx-common-go/scheduler"
```

## Purpose

Run periodic in-process work — outbox drains, cache refresh, token rotation — on fixed intervals with jitter, immediate out-of-cycle kicks, and a Postgres advisory-lock **singleton mode** so only one replica runs a given tick.

## When to use it — and when not

| Use `scheduler` | Use a K8s CronJob |
|---|---|
| Sub-minute or stateful loops tied to the service's in-memory state | Infrequent wall-clock batch (nightly reports) |
| Work that must react instantly (`Kick()` after a write) | Anything that can be a one-shot binary invocation |

There is deliberately **no cron-expression engine** here.

## Public API

```go
type Job struct {
    Name   string
    Every  time.Duration
    Jitter time.Duration        // random start offset to de-thunder replicas
    Run    func(ctx context.Context) error
}
func New(logger *zap.Logger) *Runner
func (r *Runner) Register(j Job, opts ...JobOption)   // panics on duplicate name / non-positive Every (boot-time programmer error)
func WithSingleton(pool *pgxpool.Pool) JobOption      // advisory-lock try-lock per tick
func (r *Runner) Kick(name string)                    // immediate run, coalesced
func (r *Runner) Start(ctx context.Context) error     // blocks; returns after in-flight runs finish
```

Prometheus counters per job (runs, errors, singleton skips) are registered automatically.

## Usage

```go
sched := scheduler.New(logger)
sched.Register(scheduler.Job{
    Name: "outbox-drain", Every: 5 * time.Second, Jitter: time.Second,
    Run:  func(ctx context.Context) error { return dispatcher.Tick(ctx) },
}, scheduler.WithSingleton(pool))   // one replica per tick
go sched.Start(ctx)                 // same signal ctx as the HTTP server
```

## Best practices

- Jobs must be **idempotent** — singleton mode prevents concurrent ticks, not re-runs after restarts.
- Return errors instead of logging inside the job; the runner logs uniformly and counts failures.
- Keep `Every` honest: a run that overlaps its own interval blocks the next tick (per-job serial execution).

## Pitfalls

- `Register` after `Start` is unsupported — register everything at boot.
- Singleton skips are normal in multi-replica deployments; alert on error counters, not skip counters.

## Related modules

[messaging](/modules/messaging) (the outbox dispatcher pairs with a drain job), [postgres](/modules/postgres) (advisory lock pool).
