# Tools

Status: Evolving
Scope: `@carbonenginejs/runtime/tools`
Audience: Users, maintainers, and automated readers
Summary: Names the two tooling surfaces the runtime still owns and says where the rest went.

Two things live here, and neither is a demo.

## File index

`@carbonenginejs/runtime/tools/fileindex` reads CCP-style `appfileindex` and
`resfileindex` files, diffs them, and overlays one on another. It stays in the
runtime because tools-core imports it in source to gather and compile character
catalogs.

- [class catalog](reference/classes/fileindex.md)

## Realtime wire contract

`@carbonenginejs/runtime/tools/realtime/wire` is the v1 message contract:
`CjsRealtimeProtocol`, `CjsRealtimeError` and the four protocol constants. It
imports no transport, and a test asserts that importing it touches neither
`WebSocket` nor `fetch`.

It stays because realtime is a capability that cannot exist without a server,
and its two implementations live in different packages. A conformance test
drives both halves against one recorded transcript, which is what stops the
format drifting.

- [class catalog](reference/classes/realtime.md)

## What left

The demo suite — market, Show Info, Ship Tree, chat, diagrams, the demo host and
the EVE theme, together with the realtime client — moved to
`@carbonenginejs/demos` on 2026-08-30. It was roughly 84 percent of this layer
while none of it was a runtime dependency.

Per-object tooling was retired at the same time. Trinity owns the layout in
`CjsPerObjectLayouts`; the reference knowledge that only existed in that
package's prose is now
[the per-object constant-buffer ABI](../trinity/concepts/per-object-abi.md).

The layer's `mayImport` in `layers.json` is narrowed to `global/utils` to keep
it that way. Anything here needing resource, trinity or core is not a tool.
