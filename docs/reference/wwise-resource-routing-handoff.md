# Wwise v150 routing reader requirements

Status: Experimental
Scope: `@carbonenginejs/runtime-resource` BNK readers consumed by `@carbonenginejs/runtime-audio`
Audience: Runtime-resource and runtime-audio maintainers
Summary: Defines the qualified v150 music NodeBase and bus-reader seams required for complete Wwise routing.

## Current limitation

`runtime-resource` does not currently expose typed v150 Audio Bus or Auxiliary
Bus records, and its typed music records do not retain their NodeBase output
routing. `runtime-audio` therefore retains exact direct SFX output-bus
identities but cannot yet qualify complete bus ancestry, authored base bus
gain, or music output routing. It must consume a typed reader result rather
than decode raw BNK/HIRC payloads itself.

## Planned music NodeBase contract

All four v150 music HIRCs inherit output routing from
`CAkParameterNodeBase::NodeBaseParams`. The planned typed records retain the
existing exact music-tail validation and expose the currently discarded prefix
as `nodeBase` using these ranges:

- Segment, Playlist, and Switch: `[1, anchor)`; byte zero is `uFlags`.
- Track: `[headEnd, typeAt)` or `[headEnd, simpleAt)`.

The audio builder can then walk `directParentId` from a leaf and select the
first nonzero `overrideBusId`. Track `iLookAheadTime` is a signed `s32`; the
current typed read uses the right width but the wrong numeric interpretation.

## Planned Audio and Auxiliary Bus contract

For bank version 150, HIRC 8 is Audio Bus, HIRC 18 (`0x12`) is Auxiliary Bus,
and HIRC 19 (`0x13`) is LFO. The planned reader accepts only HIRC 8 and 18 as
bus records; type 19 remains an LFO.

`inspectBNK()` removes the leading object ID, so the current entry payload
starts with:

```text
+0  u32 overrideBusId       // parent bus; zero means root
+4  u32 outputDeviceId      // root only
... AkPropBundle:
     u8 propertyCount
     u8 propertyIds[propertyCount]
     u32 propertyValues[propertyCount]
```

For a non-root bus the property count is at `+4`; for a root it is at `+8`.
The property-value array is parallel to the ID array. In v150, property
`0x04` is finite little-endian float32 Bus Volume. Keep an absent value as
`null`, distinct from authored zero. `0x0d` Output Bus Volume and `0x05`
Make-Up Gain are separate properties.

The existing BNK reader boundary will expose this typed catalog:

```js
buses: Map<id, {
    id,
    bank,
    type: "audio-bus" | "auxiliary-bus",
    overrideBusId,
    outputDeviceId,
    busVolume,
}>
```

The typed catalog is limited to bank version 150 and bounds-checks the
conditional root field plus both complete parallel property arrays. Duplicate
or invalid properties and non-finite Bus Volume values reject the typed record
while preserving raw inspection with a diagnostic. An absent Bus Volume stays
`null`, distinct from authored zero. Children are derived by reversing parent
links rather than serialized into the record, and the typed prefix does not
claim support for the rest of the `CAkBus` body.

## Activation gate

After the typed reader contract is available, `runtime-audio` can expand each
retained direct output bus into ordered, cycle-safe `busPathIds`, keep authored
base Bus Volume separate from event-action property state, and route music
instances through a dedicated authored-bus gain rather than the application
music slider. The reader alone does not complete those audio-runtime steps.
