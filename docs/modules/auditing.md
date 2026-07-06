---
id: auditing
title: auditing
---

# auditing — user-activity records

```go
import "github.com/datakaveri/dx-common-go/auditing"
```

## Purpose

Platform-standard audit trail: middleware injects a pre-filled record per request; handlers opt in by setting a business action; successful responses (200/201/204) are published **asynchronously** to the auditing exchange through a bounded in-process queue that never blocks or fails the request path.

## Key concepts

- **Opt-in per endpoint**: no `SetAction`, no audit — exactly like the Java platform's per-route audit helpers.
- **Bounded, drained, droppy**: a full buffer drops records with a warning (audit must not create backpressure); `Close()` drains everything queued, then releases AMQP.
- **Record mirrors the Java schema** — it is wire contract, not business logic. `GatewayEvent` covers the gateway's security events on the same machinery.

## Public API

```go
type Config struct{ Enabled bool; URL, Exchange, RoutingKey string; QueueSize int }
func NewPublisher(cfg Config, logger *zap.Logger) (*Publisher, error)  // (nil, nil) when disabled; nil is safe
func (p *Publisher) Publish(rec *Record)          // enqueue, fire-and-forget
func (p *Publisher) PublishEvent(ev *GatewayEvent)
func (p *Publisher) Close()                       // drain, then close AMQP

func Middleware(pub *Publisher, originServer string) func(http.Handler) http.Handler
func FromContext(ctx context.Context) *Record     // nil-safe enrichment handle
func SetAction(ctx context.Context, action string) *Record
func BaseRecord(user auth.DxUser, originServer, api, method, ip, userAgent, requestID string) *Record
func EffectiveRole(roles []string) string
```

## Usage

```go
auditPub, err := auditing.NewPublisher(cfg.Auditing, logger)  // nil when disabled — wire unconditionally
if err != nil { return err }
defer auditPub.Close()
r.Use(auditing.Middleware(auditPub, "dx-catalogue"))

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
    rec := auditing.SetAction(r.Context(), "DATABANK_CREATE")  // marks the request auditable
    // … do the work …
    if rec != nil { rec.AssetID = db.ID; rec.AssetType = "DATABANK" }
    h.sw.Created(w, db, "Created")
}
```

Only 200/201/204 responses with an action set are published — failed requests are not audit events.

## Best practices

- Mount **after** the [resolver](/modules/auth-identity) so records carry the real identity, and after RequestID so they correlate with logs.
- `Close()` during shutdown, after the HTTP server drains — that flushes the queue.
- Size `QueueSize` (default 256) for your burst profile; watch the drop warnings.

## Pitfalls

- Fire-and-forget is the contract: if a flow needs *guaranteed* audit, it is a domain event — use the [outbox](/modules/messaging).
- Auditing everything by default creates noise and load; audit state changes, not reads, unless compliance says otherwise.

## Related modules

[messaging](/modules/messaging), [identity](/modules/auth-identity).
