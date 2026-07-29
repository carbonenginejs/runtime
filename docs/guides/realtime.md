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

## Wire-only consumers

Protocol tools and Node hosts that do not need the browser client use the
narrow side-effect-free subpath:

```js
import {
    CjsRealtimeProtocol,
    REALTIME_SUBPROTOCOL
} from "@carbonenginejs/tools-browser/realtime/wire";
```

Importing this subpath does not read WebSocket or Fetch and does not start a
connection. It owns browser-safe v1 constants, message construction, and
structural normalization only. Authentication, server error policy, hubs,
gateways, retries, and callbacks remain in their environment-specific owners.

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

## Lifecycle bounds and retry policy

The client verifies that the opened socket negotiated
`carbon.tools.realtime.v1` before it sends the capability-bearing hello. A
missing or different negotiated protocol is terminal: `Connect()` rejects and
the client enters `stopped`.

Defaults are:

- `helloTimeoutMs: 10000`, measured from creation of one socket generation;
- `requestTimeoutMs: 15000` for subscribe, unsubscribe, and command;
- reconnect backoff from 250 ms to 10 seconds, factor 2, jitter 0.2;
- `outbound.maximumBufferedBytes: 262144`; and
- `outbound.maximumQueuedOperations: 64`.

A hello or request timeout closes that connection generation. Request IDs are
generation-scoped and never reused before the generation closes. Transient
network closure, timeout, and `resync_required` outcomes reconnect with bounded
backoff. Authentication, policy, version, negotiated-subprotocol, and missing
injected-API failures stop automatic retry. After correcting the cause, call
`Connect()` again explicitly; replacing a capability while stopped does not
open a socket by itself.

The socket pressure ceiling checks `bufferedAmount` plus the next serialized
frame before `send`. The caller-operation ceiling rejects excess queued work
with `outbound_pressure`. Neither path accumulates an unbounded outbound
message queue.

## Secret-safe metrics

```js
const metrics = client.GetMetrics();
```

The frozen record contains counters for connection generations, reconnect
attempts, hello and request timeouts, completed snapshot recoveries, sequence
gap resynchronizations, and outbound pressure. It never contains a capability,
URL, request body, provider payload, or error detail. Continue to use
`CjsRealtimeError.ToRecord()` for bounded observer-safe failure records.

## Provider-neutral chat

The `./chat` facade builds targeted room listeners on this realtime client.
See the [chat guide](chat.md) for hierarchy selectors, rich message assets,
room cleanup, and browser-local block lists.

## Close the client

```js
client.Close();
```

Closing stops reconnect attempts, rejects pending readiness waits, clears
connection-scoped state, cancels a pending reconnect delay, and closes the
active socket.

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
