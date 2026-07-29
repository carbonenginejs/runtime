# Authored SFX programs

Status: Experimental  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Library producers and browser application authors  
Summary: Describes optional portable SFX selection, layering, and RTPC gain behavior.

## Purpose

The schema-v2 library may contain an optional `sfx` program. The program
describes what an event does after it is posted; it does not describe where
bytes come from. Each resolved sound leaf refers to a media ID in the same
library, so `CjsAudioMan` can still deliver that ID as an individual file, a
slice of a complete original bank, or an exact original-bank range.

Without `sfx`, `eventMedia` remains the flat event-to-media fallback.

## Shape

```js
{
    schemaVersion: 1,
    events: {
        weapon_fire: [ { nodeId: "1" } ]
    },
    nodes: {
        "1": {
            type: "switch",
            scope: "switch",
            group: "ship_size",
            cases: {
                small: { nodeId: "10" },
                large: { nodeId: "2" }
            },
            default: { nodeId: "10" }
        },
        "2": {
            type: "blend",
            children: [
                { nodeId: "10", gainDb: -3 },
                {
                    nodeId: "11",
                    gainCurves: [
                        {
                            rtpc: "weapon_intensity",
                            scope: "object",
                            points: [
                                { x: 0, gainDb: -96 },
                                { x: 1, gainDb: 0 }
                            ]
                        }
                    ]
                }
            ]
        },
        "10": {
            type: "sound",
            mediaId: "777"
        },
        "11": {
            type: "sound",
            mediaId: "778",
            playbackRate: 1,
            loop: false
        }
    }
}
```

Node IDs and media IDs are positive unsigned 32-bit identities serialized as
strings. The validator rejects missing references and cycles before audio is
enabled.

## Node behavior

| Type | Behavior |
| --- | --- |
| `sound` | Produces one media voice. Optional `loop` overrides event metadata and `playbackRate` controls the buffer source. |
| `silence` | Produces no voice. This preserves authored empty switch/state cases without falling through to the default. |
| `random` | Chooses one weighted child. `mode: "shuffle"` exhausts a pool before refilling it; `avoidRepeat` excludes recent choices. |
| `sequence` | Chooses the next child for each post; `loop: false` produces no further leaves after the final child. |
| `switch` | Chooses a named case from a per-object switch or global state, with an optional `default`. Matching is case-insensitive. |
| `parallel` | Resolves every child into simultaneous voices. |
| `blend` | Resolves every child into simultaneous voices, normally with child gain curves for live crossfades. |

An event may have several roots; roots are parallel.

Random and sequence state is kept independently per game object by default.
Set `scope: "global"` on either container to share its history or position
across all game objects.

`sequence` currently means Wwise-style step sequencing between posts. A
continuous container that schedules several children during one post requires
explicit timing data and is not inferred from a flat media table.

## Gain and RTPC curves

Nodes and child edges may carry `gainDb` and `gainCurves`. Gains on every edge
of the selected path add in decibels. A curve has:

- `rtpc`: the authored parameter name;
- `scope: "object"` or `"global"`; object scope falls back to the global value
  when no per-emitter value exists; and
- optional `defaultValue`, used when neither the requested object nor global
  RTPC has a value; and
- strictly increasing `{ x, gainDb }` points.

Values between points interpolate linearly and values outside the point range
clamp to the nearest endpoint. Values at or below -96 dB become silence.
Changing an RTPC updates gain on already playing SFX voices without restarting
their buffers.

## Builder input

The optional builder accepts the graph directly as `sfx`, or as
`enrichment.sfx` alongside neutral event/culling metadata:

```js
const library = CjsAudioLibraryBuilder.build({
    indexEntries,
    soundbanksInfo,
    enrichment: {
        Events: eventMetadata,
        sfx: authoredSfxProgram
    }
});
```

When caller-provided bank access is available, `buildFromBanks()` can ask the
builder to project the conservative typed HIRC subset owned by
`runtime-resource`:

```js
const library = await CjsAudioLibraryBuilder.buildFromBanks({
    indexEntries,
    soundbanksInfo,
    includeSfx: true,
    loadBank,
    onSfxDiagnostics(diagnostics)
    {
        console.info(diagnostics);
    }
});
```

Automatic construction currently accepts Wwise generator-version-150 codec
sounds, Step Random/Sequence containers without transitions or reverse/reset
behavior, and named Step Switch/State containers without transition
parameters. It omits an entire event when that event mixes unsupported actions
or reaches an unsupported node; the optional diagnostics callback explains
each omission. Continuous scheduling, Play-and-Continue, Play-Event, actor
mixers, Layer/Blend curves, and other unqualified HIRC semantics are never
silently approximated.

The caller may instead obtain a complete built library from an API and skip
the builder. Runtime-audio performs no SFX metadata download or discovery.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Browser playback guide](browser-playback.md)
- [API reference](../reference/api.md)
