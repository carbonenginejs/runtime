# Realtime class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/tools/realtime`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for maintained realtime classes.

<!-- class:CjsRealtimeClient -->
## `CjsRealtimeClient`

Consumes Carbon realtime v1 in browsers with bounded lifecycle, outbound pressure, reconnect, secret-safe metrics, and snapshot reconciliation.

- Export: `@carbonenginejs/runtime/tools/realtime`
- Source: `src/tools/realtime/CjsRealtimeClient.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsRealtimeError -->
## `CjsRealtimeError`

Represents a stable secret-safe failure for realtime protocol and recovery work.

- Export: `@carbonenginejs/runtime/tools/realtime`
- Wire export: `@carbonenginejs/runtime/tools/realtime/wire`
- Source: `src/tools/realtime/CjsRealtimeError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsRealtimeProtocol -->
## `CjsRealtimeProtocol`

Constructs and validates messages at the Carbon realtime v1 wire boundary.

- Export: `@carbonenginejs/runtime/tools/realtime`
- Wire export: `@carbonenginejs/runtime/tools/realtime/wire`
- Source: `src/tools/realtime/CjsRealtimeProtocol.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsRealtimeSubscription -->
## `CjsRealtimeSubscription`

Tracks one desired service subscription across reconnects and snapshot recovery.

- Export: `@carbonenginejs/runtime/tools/realtime`
- Source: `src/tools/realtime/CjsRealtimeSubscription.js`
- Visibility: Public
- Kind: CarbonEngineJS
