# Runtime-utils decorator TODOs

Status: Evolving
Scope: `@carbonenginejs/runtime-utils/schema`
Audience: Schema authors and maintainers
Summary: Records reviewed decorator gaps that remain outside the current schema contract.

## Confirmed status

No missing decorator primitive is currently confirmed. `@type`, `@io`,
`@schema`, `@carbon`, and `@impl` provide the required metadata surface, and
`CjsModel.SetValues` adds declared `@io.flag`/`@io.rebuild` consequences at
write time.

## Open work

- [ ] Decide how a concrete Blue class declares an inherited Carbon method
  without adding a forwarding wrapper. `CjsSchema.decorateMethod` can already
  register the inherited implementation on an exact constructor; add a new
  declarative form only if the package-wide checker requires one.
- [ ] Keep tests proving that `@io.flag` and `@io.rebuild` tokens are added by
  changed-field writes and are never cleared by generic settle logic.
- [ ] Do not add proposed semantic aliases such as `type.position` or
  `type.worldTransform` as part of missing-decorator cleanup; those remain a
  separate API decision.
