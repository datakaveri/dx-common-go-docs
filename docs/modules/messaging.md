---
id: messaging
title: messaging (rabbitmq, outbox)
---

# messaging — rabbitmq & outbox

```go
import (
    "github.com/datakaveri/dx-common-go/messaging/rabbitmq"
    "github.com/datakaveri/dx-common-go/messaging/outbox"
)
```

## Purpose

The platform's three AMQP surfaces plus exactly-once-ish event emission:

- **`ReliablePublisher`** — the only publish path: lazy dial, optional publisher confirms, redial-and-retry-once, W3C trace-context stamped onto message headers.
- **`ConsumerRunner`** — the only consume path: dial → declare topology → consume → ack loop under a reconnect supervisor, with per-message outcomes, attempt capping, and message-id dedup.
- **`Client`** — the topology/administration client for *dynamic* queue provisioning (declare/bind/delete at runtime).
- **`outbox`** — the transactional outbox: the event row commits in the same Postgres transaction as the domain write; a background dispatcher drains to the broker.

## Key concepts

- **Outcome, not error**: a handler returns `Ack`, `Requeue` (transient), or `DeadLetter` (poison). The zero value is invalid — an accidental fall-through dead-letters (preserving the message) instead of silently acking.
- **DLQ convention**: `DeclareQueueWithDLQ` gives every queue a `<exchange>.dlx` + `<queue>.dlq`, so rejected messages are preserved, never dropped.
- **At-least-once, therefore idempotent consumers**: pair `MessageID` (producer request-id) with `Dedup` to absorb redeliveries; `MaxAttempts` breaks infinite requeue loops.
- **Outbox closes the loss window**: publish-after-commit can lose events on crash; the outbox makes write+event atomic, then `Dispatcher` (poll + `Kick()` for low latency) delivers with confirms.

## Public API

```go
// publisher
type PublisherConfig struct{ URL, Exchange, ExchangeType string; Confirms bool; Logger *zap.Logger }
func NewReliablePublisher(cfg PublisherConfig) (*ReliablePublisher, error)
func (p *ReliablePublisher) Publish(ctx, exchange, key string, body []byte, opts PublishOptions) error
func (p *ReliablePublisher) PublishJSON(ctx, exchange, key string, v any) error
func (p *ReliablePublisher) IsConnected() bool   // health seam
func (p *ReliablePublisher) Close()

// consumer
type ConsumerConfig struct {
    URL, Queue, ConsumerTag string
    PrefetchCount, MaxAttempts int
    Dedup  *Dedup
    Setup  func(ch *amqp.Channel) error   // declare topology; re-runs on every reconnect
    Logger *zap.Logger
}
func NewConsumerRunner(cfg ConsumerConfig) *ConsumerRunner
func (r *ConsumerRunner) Run(ctx, handler Handler)          // blocks; reconnects with backoff
func (r *ConsumerRunner) Stop(ctx) error                    // wait for full drain
type Handler func(ctx context.Context, d Delivery) Outcome  // Outcome: Ack | Requeue | DeadLetter
func NewDedup(capacity int) *Dedup
func DeclareQueueWithDLQ(ch *amqp.Channel, exchange, kind, queue, bindingKey string, durable bool) (amqp.Queue, error)

// topology client (dynamic provisioning only — no publish/consume methods)
func NewClient(cfg Config) (*Client, error)
// DeclareExchange, DeclareQueue(+WithArgs/+WithDLQ), BindQueue, DeleteQueue, Close

// outbox
func NewPGStore(pool *pgxpool.Pool, table string) *PGStore  // you own the table via your migrations
func (s *PGStore) Insert(ctx, tx pgx.Tx, row Row) error     // same tx as the domain write
func NewDispatcher(store Store, publish Publish, logger *zap.Logger, opts ...DispatcherOption) *Dispatcher
// WithBatchSize, WithInterval; (d *Dispatcher) Run(ctx), Kick()
```

## Usage — event emission done right

```go
pub, _ := rabbitmq.NewReliablePublisher(rabbitmq.PublisherConfig{
    URL: cfg.RabbitMQ.URL, Exchange: "authz", ExchangeType: "topic",
    Confirms: true, Logger: logger, // confirms: nil error ⇒ broker HAS the message
})
store := outbox.NewPGStore(pool, "policy_outbox")
disp := outbox.NewDispatcher(store, func(ctx context.Context, row outbox.Row) error {
    return pub.Publish(ctx, "authz", "policy."+row.Action, row.Payload,
        rabbitmq.PublishOptions{MessageID: row.RequestID})
}, logger)
go disp.Run(ctx)

// In the request path:
err := transaction.InTransaction(ctx, pool, func(ctx context.Context) error {
    if err := policies.Insert(ctx, p); err != nil { return err }
    return store.Insert(ctx, txFrom(ctx), outbox.Row{Action: "create", Payload: b, RequestID: reqID})
})
disp.Kick() // low-latency delivery instead of waiting for the next tick
```

## Usage — a consumer

```go
runner := rabbitmq.NewConsumerRunner(rabbitmq.ConsumerConfig{
    URL: cfg.RabbitMQ.URL, Queue: "policy.operations",
    PrefetchCount: 16, MaxAttempts: 5, Dedup: rabbitmq.NewDedup(4096), Logger: logger,
    Setup: func(ch *amqp.Channel) error {
        _, err := rabbitmq.DeclareQueueWithDLQ(ch, "authz", "topic", "policy.operations", "policy.*", true)
        return err
    },
})
go runner.Run(ctx, func(ctx context.Context, d rabbitmq.Delivery) rabbitmq.Outcome {
    var evt PolicyEvent
    if err := json.Unmarshal(d.Body, &evt); err != nil {
        return rabbitmq.DeadLetter          // poison: preserve on the DLQ
    }
    if err := apply(ctx, evt); err != nil {
        return rabbitmq.Requeue             // transient: retry (capped by MaxAttempts)
    }
    return rabbitmq.Ack
})
```

## Best practices

- State-changing domain events go through the **outbox**; direct `PublishJSON` is for telemetry-grade messages where loss is tolerable.
- Handlers run sequentially per runner; scale with replicas + prefetch, not in-process fan-out.
- Always pass the caller's `ctx` to publishes — that is where deadlines and trace linkage come from.

## Pitfalls

- `Dedup` and `MaxAttempts` are process-local (reset on restart); durable exactly-once needs consumer-side idempotent writes keyed by `MessageId`.
- The topology `Client` intentionally has no publish/consume — those legacy paths were removed because bare consumers died silently on reconnect.

## Related modules

[postgres](/modules/postgres) (the outbox rides its transactions), [observability](/modules/observability) (trace propagation), [scheduler](/modules/scheduler), [dxtest](/modules/dxtest) (RabbitMQ container).
