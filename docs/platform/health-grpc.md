---
title: Health and gRPC
description: Liveness, readiness, dependency probes, and error status translation.
---

# Health and gRPC

## Health registry

platform/observability/health provides Checker, CheckerFunc, Registry, Result, and Report.

~~~go
health := health.New()
health.Add("postgres", db)
health.AddOptional("redis", redisStore)
health.Add("catalogue", health.CheckerFunc(
    func(ctx context.Context) error {
        return catalogueClient.Check(ctx)
    },
))
~~~

Add registers a critical readiness dependency. AddOptional reports a degraded component without making the complete readiness report down. Nil optional checks are ignored.

Live always reports process liveness without remote calls. Ready runs probes concurrently with bounded timeouts and returns 503 when any critical dependency is down. Probe returns the structured report for tests or other transports.

Do not add a remote datastore to liveness; repeated restarts cannot repair an unavailable dependency.

## gRPC status mapping

platform/grpc uses the same platform error taxonomy as HTTP:

~~~go
if err := service.Update(ctx, request); err != nil {
    return nil, platformgrpc.Status(err)
}
~~~

CodeOf maps a platform error to a gRPC code. Status produces a gRPC status error with a safe message. FromStatus maps an incoming gRPC error back to a platform classification at a client boundary.

Transport conversion belongs at the adapter edge. Application services continue to return ordinary Go errors.
