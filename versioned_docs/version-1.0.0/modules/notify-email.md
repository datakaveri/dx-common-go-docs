---
id: notify-email
title: notify/email
---

# notify/email — platform email dispatch

```go
import "github.com/datakaveri/dx-common-go/notify/email"
```

## Purpose

Send templated emails **without touching SMTP**: publish an email request onto the controlplane's RabbitMQ email queue; its email verticle renders the template and delivers. Best-effort by contract — a failed publish is logged, never a request failure.

## Public API

```go
type Publisher interface {   // *rabbitmq.ReliablePublisher satisfies it
    PublishJSON(ctx context.Context, exchange, routingKey string, v any) error
}
type Config struct {
    Enabled           bool   `mapstructure:"enabled"`
    Queue             string `mapstructure:"queue"`               // default "email-notification"
    TemplateType      string `mapstructure:"template_type"`       // PATH | INLINE (default applied per request)
    TemplateStructure string `mapstructure:"template_structure"`
}
type Request struct{ ConsumerUserID, TemplateType, TemplateStructure string; IsCreated bool; /* asset fields… */ }
func NewNotifier(cfg Config, client Publisher, logger *zap.Logger) *Notifier
func (n *Notifier) Send(ctx context.Context, req Request) error
```

## Usage

```go
notifier := email.NewNotifier(cfg.Notifications.Email, reliablePublisher, logger)

_ = notifier.Send(ctx, email.Request{
    ConsumerUserID: user.ID,
    AssetType:      "DATABANK",
    AssetName:      db.Name,
    Status:         "APPROVED",
    IsCreated:      true,
})
```

`Enabled: false` makes `Send` a logged no-op — call sites never need their own flag checks. A nil `*Notifier` is also safe.

## Best practices

- Share the service's existing `ReliablePublisher`; don't open a second AMQP connection for email.
- Set `TemplateType/TemplateStructure` in config so call sites stay template-agnostic.

## Pitfalls

- The `Request` field names mirror the Java `EmailRequest` contract — don't rename JSON tags.
- Delivery is asynchronous and unacknowledged end-to-end; if a flow *requires* proof of delivery, email is the wrong channel.

## Related modules

[messaging](/modules/messaging).
