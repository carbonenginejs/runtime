# Consume Carbon realtime events

Status: Evolving  
Scope: `@carbonenginejs/tools-browser/realtime`  
Audience: Browser application authors and integrators  
Summary: Shows the lifecycle and security boundary of the reconnecting Carbon realtime v1 client.

## Purpose

The realtime family consumes Carbon realtime v1 through WebSocket and Fetch.
It validates messages, correlates requests, retains desired subscriptions
across reconnects, and can reconcile a cursor-stamped snapshot before resuming
live delivery.

The client does not issue capabilities or own server policy.

## Connect and subscribe

```js
import {
    CjsRealtimeClient
} from "@carbonenginejs/tools-browser/realtime";

const client = new CjsRealtimeClient({
    url: "wss://realtime.example.test/v1/realtime",
    capability,
    onError(error)
    {
        console.error(error.ToRecord());
    }
});

const subscription = client.Subscribe({
    serviceId: "example.service",
    topics: [ "status.changed" ],
    onEvent(event)
    {
        console.log(event.payload.data);
    }
});

await client.Connect();
await subscription.WhenActive();
```

Call `Subscribe` before or after `Connect`. Several desired subscriptions may
share one service ID and are retained independently across connection
generations. Pass the subscription object to `Unsubscribe`; passing a service
ID is supported only when exactly one desired subscription exists for it.

## Provider-neutral chat

The `./chat` facade builds targeted room listeners on this realtime client.
See the [chat guide](chat.md) for hierarchy selectors, rich message assets,
room cleanup, and browser-local block lists.

## Close the client

```js
client.Close();
```

Closing stops reconnect attempts, rejects pending readiness waits, clears
connection-scoped state, and closes the active socket.

## Snapshot recovery

Set `recovery: "snapshot"` on a subscription when the application requires a
consistent snapshot before newer events. The subscription buffers bounded
future events while the authenticated snapshot request is pending, installs
the snapshot cursor, and then applies only newer buffered events.

Sequence gaps, stream changes, mismatched services, and buffer overflow request
a resynchronization instead of silently continuing.

## Capability handling

Capabilities are supplied by the caller and retained only in memory.
`ReplaceCapability` replaces the value and reconnects; it does not persist the
old or new capability.

Applications should avoid logging constructor options, hello messages, or raw
transport failures. `CjsRealtimeError.ToRecord()` returns a bounded
secret-safe record for observers.

## Injected APIs

The constructor accepts injected WebSocket and Fetch implementations. This
supports deterministic offline tests and compatible hosts without adding Node
built-ins to published source.

## Protocol ownership

The client implements Carbon realtime v1 consumption. Server authentication,
grants, registries, provider integrations, hubs, gateways, rate limits, and
retained domain history remain in the Node toolchain.

Until both sides consume one released wire authority, the Node toolchain owns
the normative server contract and executable transcript. The browser client
must not evolve the wire format independently.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Chat guide](chat.md)
- [API reference](../reference/api.md)
- [Realtime class catalog](../reference/classes/realtime.md)
