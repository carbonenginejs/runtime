# Shared format helpers

Status: Stable
Scope: `src/resource/format/{imageSignatures,jsonPolicies,carbonRecordGuard}.js` and `src/global/utils/checksum.js`
Audience: Format authors
Summary: The helper modules shared across concrete formats, and the one case where apparent duplication is deliberate.

## Why this page exists

Three of these modules are files of exported functions rather than classes, so
the class catalog in [reference/classes/core.md](../reference/classes/core.md)
cannot list them and `lint:docs` cannot notice they are missing. They are easy
to rediscover and easy to duplicate back into the formats they came from.

## `format/imageSignatures.js`

Container identification for the raster formats. Exports the four sniffers
(`isPNG`, `isJPEG`, `isDDS`, `isTGA`), the dispatcher `identifyImageBytes`, and
the shared record helpers `foreignImageRecord`, `imageMimeType`, `pngChannels`,
`rawVariant` and `capitalizeFormatId`.

Before this module, `png`, `jpeg`, `tga` and `dds` each carried ALL FOUR
sniffers and ALL FOUR header inspectors, so each of eight functions existed four
times. Every caller passes its own id as `expectedType` and a foreign detection
always throws, so the only value that ever escaped a foreign inspector was the
format NAME in an error message.

Two behaviours come from the owning copy rather than the majority, and both are
deliberate:

- `isDDS` validates the 124-byte header size, not only the `DDS ` magic. `DDS `
  followed by anything is not a DDS file, and accepting it sends the caller into
  a header parse that cannot succeed.
- `isTGA` accepts 15bpp.

All four readers therefore now identify a 15bpp TGA and a malformed DDS the same
way. `isTGA` is a heuristic over an 18-byte header — TGA has no magic number —
so it must stay LAST in `identifyImageBytes`, after every format that can prove
itself.

## `format/jsonPolicies.js`

Four named `toJSON` policies. **The obvious reading — that 27 formats carried 27
copies of one helper — is wrong, and acting on it would be a regression.** They
fall into four groups whose output is CONTRADICTORY by design:

| Policy | Formats | `Uint8Array` becomes |
|---|---|---|
| `toJsonWithByteSummary` | 15 | `{ byteLength }` — the bytes are the file's bulk data |
| `toJsonWithArrayValues` | 3 | expanded — for geometry the typed array IS the document |
| `toJsonWithCollections` | 4 | expanded, plus `Map`/`Set` handling |
| `toJsonAcyclic(value, label, seen)` | 3 | expanded, with a cycle guard that throws |

One function with flags would have picked a winner and silently changed the
rest. `fbx` and `cmf` keep their own; one caller each.

`toJsonAcyclic` uses a PATH set, not a visited set: a repeated reference is a
DAG and must serialise, while only a true cycle throws. Getting that backwards
rejects ordinary shared sub-objects. It also fixes a defect inherited from the
three readers it replaced, where a cycle reached through an ARRAY was not caught
— the array branch returned before `seen` was consulted, so `list.push(list)`
overflowed the stack instead of throwing. Fixed rather than reproduced: these
policies are ours, and Carbon persists through Blue rather than JSON, so there
is no donor behaviour to stay faithful to.

## `format/carbonRecordGuard.js`

`assertCarbonRecord(record, noun)` — the plain-object guard that opened
`fromCarbonBinary` with identical text at 9 call sites across 8 reflection
classes (`Tr2EffectStageInput` has two). The noun is the only part worth
keeping, because it says WHICH record was malformed when a graph of them is
being rebuilt.

## `global/utils/checksum.js`

`crc32(bytes, start, end)` and `adler32(bytes, start, end)`. CRC-32 existed
three times (cmf, gr2, png) with the same reflected polynomial `0xEDB88320`,
initial value and final xor; adler32 twice (png, fbx). Verified against
published vectors including the adler32 modulo rollover above 5552 bytes.

Two independent copies are NOT duplicates of these and must stay:

- the Ogg page checksum in `wem` — different polynomial and direction, and its
  comment says so;
- the copy in `gr2/writer.test.mjs`, which is an oracle. A test that imports the
  implementation it is checking proves nothing.

## The rule these share

A helper is shared when the call sites agree on what it should do. Where they
disagree — the JSON policies — naming the disagreement is the work, and
collapsing it is the bug. Not every duplicate resolves toward the shared
version either: `toRecordFloat` reused a module scratch view while the shared
`float32FromBits` allocated per call, and the fix was to improve the shared one.
