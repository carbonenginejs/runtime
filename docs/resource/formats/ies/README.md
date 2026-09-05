# IES photometric bytes

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/ies`
Audience: Resource authors and integrators
Summary: Reads authored TILT=NONE photometric tables without creating light textures.

This provisional reader supports the structural subset described below. Its
payload and validation rules may evolve as additional profiles are qualified.

## Read bytes

```js
import { CjsIESFormat } from "@carbonenginejs/runtime/resource/formats/ies";

const photometry = CjsIESFormat.read(bytes, { source: "fixture.ies" });
const sample = photometry.candelaValues[
    horizontalIndex * photometry.verticalAngleCount + verticalIndex
];
```

The input is an `ArrayBuffer` or an `ArrayBufferView`; view offsets and lengths
are respected. Text is decoded as UTF-8 (including ASCII). The optional `source`
labels parse errors. The only output selector is `emit: "payload"`, the default.

The plain JSON-compatible result contains `headerText` (the text before TILT,
with trailing whitespace removed), `tilt`, and these numeric header fields:
`lampCount`, `lumensPerLamp`, `candelaMultiplier`, `verticalAngleCount`,
`horizontalAngleCount`, `photometricType`, `unitsType`, `width`, `length`,
`height`, `ballastFactor`, `futureUse`, and `inputWatts`.

`verticalAngles` and `horizontalAngles` retain the authored degrees.
`candelaValues` retains every horizontal plane in file order, with vertical
samples contiguous within each plane. Multipliers and units are retained;
they are not applied to the values.

## Supported boundary

The reader accepts the 13-field photometric header followed by both angle tables
and exactly `verticalAngleCount * horizontalAngleCount` samples. It supports
`TILT=NONE` only. Included and external tilt data are explicitly rejected.
Whitespace and comma separators, decimal numbers and exponent notation are
accepted. Malformed numbers, nonfinite values, invalid integer fields,
nonpositive angle counts, truncated tables and extra numeric data are rejected.
This is a structural reader, not a complete LM-63 semantic validator: it does
not validate photometric angle coverage or interpret version-dependent fields.

`inspect()` validates the complete input and returns the same metadata without
`candelaValues`. Instance `Read()` and `Inspect()` merge instance defaults with
per-call options. The inherited `readAsync()`, `ReadAsync()`, `is()`,
`getSupport()` and `verifySupport()` use the shared
[format capability contract](../../concepts/format-capabilities.md).

Profile normalization, angular sampling, DDS handling, half-float conversion,
mip generation and GPU uploads belong to consuming resource and engine code.
The format has no resource-class or GPU dependency.
