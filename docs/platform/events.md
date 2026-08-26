---
title: Events and Outbox
description: Typed topics, envelopes, buses, AMQP, in-memory tests, and durable publication.
---

# Events and outbox

## Typed topics

~~~go
type PolicyCreated struct {
    PolicyID string
    ItemID   string
}

var PolicyCreatedTopic =
    events.NewTopic[PolicyCreated]("policy.created")

err := PolicyCreatedTopic.Publish(
    ctx,
    bus,
    PolicyCreated{PolicyID: policy.ID, ItemID: policy.ItemID},
    events.WithCorrelationID(correlationID),
)
~~~

A Topic binds routing name, payload type, and version. V selects a non-default payload version. WithID, WithCorrelationID, and WithOccurredAt control envelope metadata.

## Subscribe

~~~go
err := PolicyCreatedTopic.Subscribe(
    bus,
    "authz-sync",
    func(ctx context.Context, event PolicyCreated) error {
        return projector.Apply(ctx, event)
    },
)
~~~

Every subscription names a consumer group. Members of one group share work; different groups each receive the event. Handlers must be idempotent by event ID because delivery is at least once.

Returning an ordinary error invokes the adapter's retry behavior. ErrDrop acknowledges and discards an event that can never succeed. Treat this as an explicit observable policy; malformed or unsupported-version messages otherwise hide contract defects.

## Bus implementations

- NewMemory provides an in-process bus for tests.
- platform/events/amqp.Open provides the RabbitMQ adapter with exchange, retry, dead-letter, reconnect, and confirmation configuration.

Application packages depend on events.Bus or their own narrower publisher port, never an AMQP connection.

## Transactional outbox

NewOutbox(db, table) stores an event envelope through the ambient SQL transaction. The package-level Publish helper writes a typed topic to the outbox. NewDispatcher publishes batches to a Bus; Run loops until context cancellation and Kick requests immediate work.

Use the outbox when domain state and publication must be atomic. Consumers still need idempotency, and the platform does not claim global exactly-once delivery.
