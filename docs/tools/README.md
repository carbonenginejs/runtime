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

## What left

The demo suite — market, Show Info, Ship Tree, chat, diagrams, the demo host and
the EVE theme, together with the realtime client — moved to
`@carbonenginejs/demos` on 2026-08-30. It was roughly 84 percent of this layer
while none of it was a runtime dependency. The realtime wire contract followed
it there once the server also lived in that package: realtime is optional, not
a runtime requirement, and both halves of the protocol are now owned and
conformance-tested in one place.

Per-object tooling was retired at the same time. Trinity owns the layout in
`CjsPerObjectLayouts`; the reference knowledge that only existed in that
package's prose is now
[the per-object constant-buffer ABI](../trinity/concepts/per-object-abi.md).

The layer's `mayImport` in `layers.json` is narrowed to `global/utils` to keep
it that way. Anything here needing resource, trinity or core is not a tool.
