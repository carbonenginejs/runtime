# Wwise v150 routing support

Status: Experimental
Scope: `@carbonenginejs/runtime-resource` BNK readers consumed by `@carbonenginejs/runtime-audio`
Audience: Runtime-resource and runtime-audio maintainers
Summary: Defines implemented dry-output routing and the remaining Wwise bus-processing work.

## Current support

`runtime-resource` exposes typed complete v150 Audio Bus, Auxiliary Bus, Fx
ShareSet, and Fx Custom bodies and retains every music node's qualified
NodeBase. `runtime-audio` consumes the routing records only in its optional
builder. Portable SFX sounds and music tracks
carry their effective output bus, ordered cycle-safe ancestry, summed authored
base Bus Volume, and summed Make-Up Gain. Playback adds live Bus Volume action
state without changing the application SFX or music sliders.

## Music NodeBase contract

All four v150 music HIRCs inherit output routing from
`CAkParameterNodeBase::NodeBaseParams`. The typed records retain the
existing exact music-tail validation and expose the retained prefix
as `nodeBase` using these ranges:

- Segment, Playlist, and Switch: `[1, anchor)`; byte zero is `uFlags`.
- Track: `[headEnd, typeAt)` or `[headEnd, simpleAt)`.

The audio builder walks `directParentId` from a leaf and selects the first
nonzero `overrideBusId`. Track `iLookAheadTime` is read as a signed `s32`.

## Audio, Auxiliary Bus, and effect contract

For bank version 150, HIRC 8 is Audio Bus, HIRC 18 (`0x12`) is Auxiliary Bus,
and HIRC 19 (`0x13`) is LFO. The reader accepts only HIRC 8 and 18 as
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

The BNK reader boundary exposes this typed bus catalog:

```js
buses: Map<id, {
    id,
    bank,
    type: "audio-bus" | "auxiliary-bus",
    overrideBusId,
    outputDeviceId,
    properties: [{ id, rawValue, floatValue }],
    busVolume,
    makeUpGain,
    outputBusVolume,
    positioning,
    aux,
    policy,
    channelConfig,
    hdr,
    recoveryTime,
    maxDuckVolume,
    ducks,
    fx,
    metadata,
    rtpcs,
    state,
}>
```

The typed catalog is limited to bank version 150 and consumes the complete bus
body exactly. It bounds-checks conditional fields, parallel property arrays,
positioning and aux routing, duck rules, ordered effect/metadata slots, RTPCs,
and state data. Duplicate or invalid properties, non-finite typed values,
truncation, and trailing data reject the typed record while preserving raw
inspection with a diagnostic. Absent projected gain values stay `null`,
distinct from authored zero. Children are derived by reversing parent links
rather than serialized into the record.

The same boundary exposes v150 HIRC 16 Fx ShareSet and HIRC 17 Fx Custom
records. Their generic typed form preserves plug-in identity, the exact opaque
parameter block, media index-to-source mappings, RTPC curves, state values, and
initial plug-in property values. The resource layer does not interpret opaque
plug-in parameters or media as audio.

Across EVE build 3444265's 29 audio banks, the exact-end readers decode all 133
serialized bus bodies and all 410 serialized effect bodies with no failures.
The later-bank-wins catalogs contain 130 buses and 381 effects. The effect
records cover 16 plug-in classes; the one Convolution Reverb ShareSet maps
media index zero to source 154360724, whose `PLUG` payload is opaque plug-in
media rather than WEM audio.

## Remaining work

The dry-output route applies Bus Volume and Make-Up Gain when those properties
occur in the selected dry ancestry. The typed reader also preserves Output Bus
Volume, but playback does not apply it yet. Effects, auxiliary sends and
chaining, formal ducking, meters, virtual-voice behavior, and spatial
diffraction remain separate runtime slices. Those features need their complete
effective send/property projection, qualified plug-in adapters, and signal
semantics; the typed catalogs do not imply that playback is implemented.

In EVE build 3444265, the two buses that author Make-Up Gain are Auxiliary
Buses. No SFX leaf or music track reaches either bus through its dry-output
ancestry. A total of 516 SFX leaves reach them only through auxiliary sends,
and both routes contain effect processing. Consequently, the implemented dry
route retains the correct separate Make-Up Gain contract but does not yet make
those EVE values audible. The next EVE-effective slice must decode and realize
auxiliary routing together with its ordered effect chains; routing those sends
as dry parallel copies would not be a parity implementation.
