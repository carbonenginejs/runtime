# Main semantic extraction

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/shader` and `@carbonenginejs/runtime-trinity/eve`
Audience: Engine authors and runtime integrators
Summary: Defines the GPU-free extraction of reflected effect constants and Eve Main per-object values.

## Purpose

Two helpers expose proven CPU values for a bounded Eve space-object Main
binding profile. They return detached plain data that an engine can validate,
pack, and upload without giving Trinity ownership of shader buffers or a
graphics device.

Neither helper builds per-frame state.

## Effect constant extraction

Import:

```js
import {
    extractTr2EffectConstantValues
} from "@carbonenginejs/runtime-trinity/shader";
```

`extractTr2EffectConstantValues(effect, reflectedConstants)` reads only the
requested reflected local float constants from `effect.parameters` and
`effect.constParameters`.

Dynamic parameters use `CopyValueToEffect`, preserving rerouted values and
sRGB-to-linear conversion. Constant parameters supply the requested prefix of
their stored numeric value. The result and each returned number array are
frozen.

The helper fails closed when:

- the effect or reflection list is malformed;
- a reflected name or parameter name is duplicated;
- a requested parameter is missing;
- the reflected type, element count, or dimension is unsupported;
- a resource-like or other non-numeric value is supplied; or
- a value is not representable as a finite float32.

Errors use `CJS_TRINITY_EFFECT_CONSTANT_*` codes that identify reflection,
layout, duplicate, missing, dimension, unsupported-value, and numeric-value
failures.

## Eve per-object extraction

Import:

```js
import {
    createEveSpaceObjectMainPerObjectValues
} from "@carbonenginejs/runtime-trinity/eve";
```

`createEveSpaceObjectMainPerObjectValues(options)` returns frozen
`perObjectVS` and `perObjectPS` objects. It requires:

- an object with 16-value current, previous, and inverse world transforms; and
- an explicit four-value `shipData`.

The helper maps trustworthy object clip values and custom masks, copies
supported fields from an optional shared per-object record, recognizes
`shLighting` as the `shLightingCoefficients` alias, and applies explicit vertex
and pixel overrides.

Precedence is:

1. object-derived values;
2. explicitly supplied shared values;
3. stage-specific overrides.

Inputs are cloned recursively, so later mutation of the object, shared record,
ship data, masks, or overrides does not alter the result. Unknown override
names and non-finite numeric data fail closed with
`CJS_TRINITY_SPACE_OBJECT_MAIN_VALUES_INVALID`.

## Required `shipData`

`shipData` remains caller-supplied because there is no general
source-proven builder for every Eve space-object graph. The helper does not
guess this vector.

Optional values such as ellipsoid data, screen size, morph and bone offsets,
impact fields, and custom data appear only when the object, shared record, or
explicit overrides provide them.

## Per-frame ownership

The Trinity graph does not completely represent previous-frame policy, shadow
state, projection conventions, gamma and mip policy, jitter, resolution,
presentation, or other renderer-owned frame values.

The active engine supplies complete `perFrameVS` and `perFramePS` semantic
objects before its serializer packs or uploads them.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Current API](api.md)
- [Implementation status and audits](implementation-status.md)
