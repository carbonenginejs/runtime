# Browser tools architecture

Status: Evolving  
Scope: `@carbonenginejs/runtime/tools`  
Audience: Browser application authors and maintainers  
Summary: Defines the browser toolbox dependency direction, admission boundary, and security constraints.

## Purpose

The runtime `/tools` layer turns lower-level CarbonEngineJS contracts into browser-usable
clients and tools. It is deliberately able to hold several unrelated tool
families when their common architectural property is a browser-safe,
user-facing implementation.

## Dependency direction

```text
global/utils  audio  resource  trinity/perobject
       ^             ^               ^                    ^
       +-------------+---------------+--------------------+
                             |
                        runtime/tools
                             ^
                             |
           browser applications, demos, and injected adapters
```

The executable layer manifest permits browser-safe internal imports from lower
runtime layers. Published source imports only the contracts each current family
uses, including the device-free Trinity per-object layout. Tests may use Node
facilities, but no Node built-in enters `src/tools`.

## Owned responsibilities

The implemented package currently owns:

- remote schema-v2 audio-document acquisition and canonical installation;
- caller-selected SoundbanksInfo, neutral enrichment, and remote file-index
  projection into the runtime builder's plain input shape;
- exact remote individual/whole-file and byte-range reads for
  `CjsAudioMan`'s structural provider contract;
- appfileindex and resfileindex parsing, discovery, immutable lookup, named
  overlays, and safe HTTP(S) source resolution;
- naming, packing, synthesis, decoding, and shader inspection for Carbon
  per-object constant-buffer layouts owned by runtime-trinity;
- provider-neutral chat-room selection, browser-local filtering, disposable
  room listeners, and consumption of server-resolved presentation assets;
- independent demo registration, serialized parent-container switching, and
  cancellation-aware demo lifecycle;
- authority-ordered browser data-provider composition for caller-supplied JSON,
  remote APIs, browser databases, and memory without deciding domain policy;
- DOM-free regional-market HTTP clients, direct public ESI translation,
  caller-owned memory records, presentation-neutral selection/search state,
  and order/history analysis;
- an optional Market Details window, history chart, and stylesheet that consume
  the Market controller without duplicating source acquisition;
- provider-neutral Ship Show Info lifecycle, lazy panel acquisition, optional
  regional-price and session decoration, caller-owned memory records, and an
  injected asynchronous renderer contract;
- an optional Ship Show Info window and stylesheet that consume that
  controller without duplicating source acquisition or renderer lifecycle;
- explicit feature-demo compositions that mount directly or provide the same
  instance shape to `TnyDemoHost`;
- cancellation-aware graphics-adapter lifecycle without importing or creating
  a graphics engine or context;
- an optional asset-free, scoped EVE-like demo theme;
- Carbon realtime v1 message validation, WebSocket consumption, exact
  subscriptions, bounded hello/request/pressure behavior, reconnect
  classification, secret-safe metrics, capability replacement, and snapshot
  recovery;
- a narrow side-effect-free Carbon realtime v1 wire subpath shared with Node
  protocol consumers without sharing server implementations;
- caller-injected WebSocket, Fetch, and related browser capabilities.

Future demos, inspectors, loaders, and integration helpers may join when they
provide a usable browser-facing outcome.

## Logic and UI dependency direction

Feature source clients and presentation-neutral behavior are reusable library
layers. Optional UI may import them; they never import the UI, a theme, or a
demo entry point. Standalone and catalogue demos are composition roots that
wire providers, runtime adapters, UI, theme, routing, and configuration.

The `./demos` JavaScript subpath owns presentation-neutral lifecycle
coordination only. `./demo-apps` contains optional composition roots that may
import feature UI. The independently imported `./theme/eve.css` subpath owns
shared styling. Feature migrations retain separate public imports for
source/client behavior and optional presentation so a consumer can replace the
markup without copying the logic.

Baseline browser-safety tests reject DOM-presentation APIs and CSS imports from
the `src/tools/demos`, `src/tools/market`, and `src/tools/ship-show-info` logic layers.
Feature-specific logic layers require the same one-way check when they are
added.

## Admission rules

Code belongs here when:

1. a library user can directly use the browser-facing result;
2. the implementation can run without Node built-ins;
3. the behavior is tooling or integration rather than shared runtime policy;
4. caller capabilities and remote inputs can cross explicit validation
   boundaries;
5. its domain contracts remain owned by the relevant runtime or protocol
   package.

The package may be varied, but each public family still needs a coherent
subpath, tests, documentation, and owned security boundary.

## Ownership elsewhere

- Arrays, bytes, text, JSON, shared predicates, validation, and other neutral
  mechanics belong in `@carbonenginejs/runtime/utils` or another focused global
  subpath.
- Runtime graph objects and domain readers belong in their owning runtime
  layers.
- Audio event interpretation, decoded-buffer caching, scheduling, and playback
  semantics belong in `@carbonenginejs/runtime/audio`.
- Audio document construction, event/media selection, WEM preparation,
  decoded-buffer retention, and playback belong in
  `@carbonenginejs/runtime/audio`.
- Physical audio-byte resource ownership belongs in
  `@carbonenginejs/runtime/resource`.
- BNK/WEM parsing and conversion belong in
  `@carbonenginejs/runtime/resource`.
- Canonical per-object field/layout definitions belong in
  `@carbonenginejs/runtime/trinity/perobject`; the tools layer owns only the
  browser-safe inspection and packing utilities around them.
- `@carbonenginejs/tools-core` is the API authority for maintained demos. It
  owns Node filesystems, acquisition caches, provider credentials,
  authenticated ESI access, generated SDE facets, servers, command-line
  interfaces, and build orchestration. Runtime tools consume its documented
  HTTP and shared wire contracts through injected browser transports.
- Textures, buffers, pipelines, and backend realization belong in explicit
  `engine/*` layers.
- Audio and character library construction, planning, and runtime semantics
  remain in their owning runtime packages. Demos may receive their prepared
  documents and runtime capabilities without wrapping them in a graphics
  lifecycle.

## Security

File-index locations are untrusted wire values. The file-index family rejects
schemes, absolute paths, queries, fragments, malformed escapes, and traversal
outside a configured HTTP(S) base URL.

Realtime capabilities are caller-supplied secrets retained only in memory.
Realtime errors expose bounded, secret-safe records. Server authentication,
grants, provider policy, hubs, gateways, and retained history remain outside
this package.

Chat filtering in this package is local to one browser facade. Server-side
policy remains authoritative because blocked messages can be suppressed before
they reach any browser. Provider credentials, upstream room sharing, supplier
asset resolution, and moderation synchronization remain server concerns.

Audio acquisition accepts caller-selected URLs, logical paths resolved through
an injected remote file index, and fetch options. It does not discover
installation paths, cache layouts, credentials, or service roots. It performs
no audio-library construction or runtime selection.

## Environment contract

JavaScript source is side-effect-free by public subpath and uses standard
ECMAScript plus Web APIs. Independently imported theme and feature stylesheets
are the only declared side-effectful assets. Browser globals may be replaced
with injected implementations for offline tests and compatible non-browser
hosts.

Published tools source imports no Node built-ins and
depends on no Node-only package. Tests and package checks may use Node as a
browser-compatible development host. Browser-safe runtime package subpaths
remain valid dependencies.

## Related documentation

- [Package documentation](README.md)
- [Audio-library guide](guides/audio-libraries.md)
- [Chat guide](guides/chat.md)
- [Browser demo guide](guides/demos.md)
- [Planned interactive diagram demos](guides/interactive-diagrams.md)
- [File-index guide](guides/file-indexes.md)
- [Regional-market guide](guides/market.md)
- [Ship Show Info guide](guides/ship-show-info.md)
- [Per-object tooling](perobject/README.md)
- [Realtime guide](guides/realtime.md)
- [Class-purpose catalog](reference/classes/README.md)
