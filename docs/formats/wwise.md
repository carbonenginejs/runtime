# Wwise soundbanks and media

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource/formats/bnk`, `@carbonenginejs/runtime-resource/formats/wem`  
Audience: Users and integrators  
Summary: Defines the Wwise container inspection, event/media graph extraction, and WEM conversion contracts.

## Scope

`formats/bnk` and `formats/wem` cover Wwise container inspection, event/media
graph extraction, embedded-member access, and the currently supported WEM
conversion routes. They do not own AudioBuffer construction, playback, audio
manager behavior, or decoded-backend retention.

## Soundbank inspection

`CjsBnkFormat.inspect()` decodes the chunk map, embedded media index, bank
names, and the HIRC listing with version-stable typed fields (event action
lists, action type/target, sound and music-track source ids; pinned against
bank generator version 150). The Wwise-domain toolkit is grouped under the
`CjsBnkFormat.wwise` static: the SoundbanksInfo catalog helpers, the FNV-1
id hash, event-to-media resolution, and typed authored-SFX nodes:

```js
import { CjsBnkFormat } from "@carbonenginejs/runtime-resource/formats/bnk";
import { CjsWemFormat } from "@carbonenginejs/runtime-resource/formats/wem";

const inspections = bankByteArrays.map(bytes => CjsBnkFormat.inspect(bytes));
const { eventMedia } = CjsBnkFormat.wwise.eventMediaFromBanks(inspections);
// eventMedia: Map<eventObjectId, Set<wemId>> - banks may split events from
// their target sounds, so pass every related bank to one call.

const {
    nodes,
    events,
    actions,
    diagnostics
} = CjsBnkFormat.wwise.sfxNodesFromBanks(inspections);

const ogg = CjsWemFormat.toOgg(wemBytes);   // Wwise Vorbis -> Ogg (lossless)
const pcm = CjsWemFormat.toPcm(wemBytes);   // PTADPCM / 16-bit PCM -> float32
```

The read/inspect path stays a pure container reader;
`wwise.eventMediaFromBanks` is graph interpretation offered for consumers
with their own engines — the resource lifecycle never calls it.

Typed authored-SFX tail decoding is deliberately pinned to bank generator
version 150. It preserves Random/Sequence, Switch/State, and Layer fields
without deciding how an audio runtime should lower them. Unsupported versions,
failed exact-end anchors, ambiguities, and duplicate object identities are
reported through `diagnostics` instead of being guessed. Like
`eventMediaFromBanks`, `sfxNodesFromBanks` is consumer-facing graph
interpretation; the resource lifecycle never calls it.

## Related documentation

- [Format subpaths](README.md)
- [Format ownership and fork provenance](provenance.md)
