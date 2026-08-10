# Format type resolution

Status: Evolving
Scope: `CjsFormat.resolveType`, `CjsResourceProbe`, and the formats that override them
Audience: Anyone adding a format, choosing a decode route, or debugging a mislabeled container
Summary: Separates what a container claims about itself from what a reader has evidence it can decode, and states how a verified resolution may and may not change a route.

## Claims versus evidence

A container's header is a claim. `inspect()` and `isSupported()` report that
claim: they read the declaration and answer whether this format recognizes it.
That is the right answer almost always, and it is cheap.

`resolveType()` answers a different question — what the reader has *evidence*
it can actually decode. It performs one bounded asynchronous content check: a
magic number, a first frame or block, a setup header. It never decodes the
payload.

The distinction matters because a mislabeled container is indistinguishable
from a correct one until something looks at the content. Routing on the
declaration alone turns that into a decode failure much later, somewhere that
has forgotten what the file claimed to be.

## The contract

`resolveType()` returns a `CjsResourceProbe`. The probe carries a persisted
`verified` boolean, and its `metadata` carries the evidence: what was
declared, what resolved, and whether those disagreed. `preferred` names the
resolved decode route.

Three rules govern what a probe may do:

- **A caller-forced emit always wins.** Resolution informs a default; it never
  overrides an explicit request.
- **An unverified result never changes a route.** The base implementation
  delegates to `isSupported()` and sets `verified` to false, so a format
  without an override costs nothing and cannot silently redirect anything.
- **Opting in is per format.** Overriding is a decision made by a format that
  has a cheap, meaningful content check — not a requirement on all of them.

That third rule is why this is a seam rather than a pipeline stage. The
zero-extra-work path is the default, and it stays free.

## What a check may look like: wem

`CjsWemFormat` overrides it, and its shape is the model. The `fmt` tag is the
declaration. Each candidate codec gets one bounded **structural** check
against container facts — a Wwise Vorbis sidecar present with a positive
sample count; a PTADPCM frame layout satisfying the decoder's own guard with
block-aligned data; PCM with self-consistent block alignment and byte rate.
No audio is decoded in any of them.

The declared codec is validated first. Only when its check fails are the other
candidates tried, in order. The resolved codec maps to an emit — Wwise Vorbis
to `ogg`, PTADPCM and PCM to `pcm`, anything unresolved to `raw`.

A census of all 8,987 embedded wems in one EVE build found no mislabeled tag.
That is the point rather than a reason to drop the check: it converts a
corpus-wide assumption into a fact verified per file, and the cost of holding
that guarantee is one structural read.

## Current limits

Resolution is available to callers but is **not yet wired into the resource
read path**. `CjsResMan` still selects a format by extension using the
synchronous `isSupported()` tie-break, so a mislabeled file routed through
ordinary resource acquisition is not corrected today. Consumers that need the
verified answer call `resolveType()` themselves.

Wem exposes `raw`, `ogg`, and `pcm` as distinct outputs, so a caller still
chooses a decoder. A single resolve-then-route output that hides the codec
choice is [planned](../roadmap.md), not present.

## Related documentation

- [Resource lifecycle](resource-lifecycle.md) — how a resource is acquired,
  prepared, and published.
- [Wwise formats](../formats/wwise.md) — the wem container these checks read.
- [Roadmap](../roadmap.md) — the unbuilt read-path integration.
