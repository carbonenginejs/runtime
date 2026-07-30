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
lists, action type/target, sound and music-track source ids). For bank
generator version 150, recognized Event Actions additionally expose exact
scope/mode, property and range bundles, delay/transition/probability values,
fade and action flags, exceptions, and Play bank identities. The
Wwise-domain toolkit is grouped under the `CjsBnkFormat.wwise` static: the
SoundbanksInfo catalog helpers, the FNV-1 id hash, event-to-media resolution,
typed Event Actions, and typed authored-SFX nodes:

```js
import { CjsBnkFormat } from "@carbonenginejs/runtime-resource/formats/bnk";
import { CjsWemFormat } from "@carbonenginejs/runtime-resource/formats/wem";

const inspections = bankByteArrays.map(bytes => CjsBnkFormat.inspect(bytes));
const action = CjsBnkFormat.wwise.parseEventAction(actionPayload, {
    bankVersion: 150
});
const { eventMedia } = CjsBnkFormat.wwise.eventMediaFromBanks(inspections);
// eventMedia: Map<eventObjectId, Set<wemId>> - banks may split events from
// their target sounds, so pass every related bank to one call.

const {
    nodes,
    nodeBases,
    actorMixers,
    attenuations,
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

The undecoded-container ID scan used by `eventMediaFromBanks` is diagnostic
reachability, not an authoritative playback program. Consumers requiring
audible correctness should use the typed `sfxNodesFromBanks` graph and fail
closed for unsupported events.

Typed authored-SFX tail decoding is deliberately pinned to bank generator
version 150. Recognized Event Actions are accepted only when the whole body
is consumed; unknown, truncated, other-version, or trailing-byte bodies retain
their shallow action type/target and raw payload, with `action: null`.
`nodes` contains playable Sound, Random/Sequence, Switch/State, and Layer
objects. The separate `nodeBases` map preserves common authored properties
and positioning facts for playable nodes and Actor-Mixers.
`actorMixers` contains HIRC type 7 hierarchy objects; they are inheritance
parents, not playable parallel containers. `attenuations` contains raw HIRC
type 14 cone data, signed curve-slot assignments, graph points, and RTPCs
without assigning application meaning to a curve.

Unsupported versions, failed exact-end anchors, ambiguities, NodeBase
failures, and duplicate object identities are reported through `diagnostics`
instead of being guessed. Consumers may resolve hierarchy and project
runtime-specific metadata from these raw facts. In particular, this format
layer does not infer a numeric maximum radius from an attenuation curve. Like
`eventMediaFromBanks`, `sfxNodesFromBanks` is consumer-facing graph
interpretation; the resource lifecycle never calls it.

## Related documentation

- [Format subpaths](README.md)
- [Format ownership and fork provenance](provenance.md)
