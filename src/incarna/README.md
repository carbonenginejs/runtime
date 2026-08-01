# src/incarna

This directory contains minimal, explicitly evidenced contracts needed to
hydrate historical Incarna assets whose class identities no longer exist in
the current Carbon checkout.

Current Carbon classes belong in `src/trinity`. CarbonEngineJS-owned document
and adapter code belongs outside both native trees. A historical class enters
this directory only with pinned asset/schema evidence, a bounded hydration
purpose, and no claim of current Carbon behavioral parity.

## Recovered hydration shells

| Family | Classes | Evidence boundary |
| --- | --- | --- |
| `curves/` | `Tr2ColorCurve`, `Tr2ColorKey`, `Tr2ScalarCurve`, `Tr2ScalarKey` | Historical Black identities match compact Curve2 layouts; twelve curve files completed under the labelled legacy schema hypothesis. |
| `interior/` | `Tr2InteriorCell` | Four historical character-creation scenes completed; only `isUnbounded` and optional `shProbeResPath` were observed. |

These records support `CjsModel.from(record)` hydration. The curve records also
adapt matching historical Curve2 evaluation behavior. They do not import the
old `Tw2Curve` hierarchy or its static testing surface. They are also not
substitutes for runtime-trinity's current Carbon `Tr2CurveColor`,
`Tr2CurveScalar`, and `Tr2CurveScalarKey` classes, whose persisted layouts are
materially different.

The historical interior static, flare, particle, shader-material,
shader-manager, and shader-description families remain deferred because their
complete value wire shapes have not been recovered.
