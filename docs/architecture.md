# Browser tools architecture

Status: Evolving  
Scope: `@carbonenginejs/tools-browser`  
Audience: Browser application authors and maintainers  
Summary: Defines the browser toolbox dependency direction, admission boundary, and security constraints.

## Purpose

`tools-browser` turns lower-level CarbonEngineJS contracts into browser-usable
clients and tools. It is deliberately able to hold several unrelated tool
families when their common architectural property is a browser-safe,
user-facing implementation.

## Dependency direction

```text
 runtime-utils        runtime-audio/library
        ^                       ^
        |                       |
        +--------- tools-browser+
                    ^
                    |
        browser applications and Node wrappers
```

Published source imports browser-safe runtime primitives, the canonical audio
document installer, and local modules. Tests may use Node facilities, but no
Node built-in enters `src/`.

## Owned responsibilities

The implemented package currently owns:

- remote schema-v2 audio-document acquisition and canonical installation;
- caller-selected SoundbanksInfo, neutral enrichment, and remote file-index
  projection into the runtime builder's plain input shape;
- exact remote individual/whole-file and byte-range reads for
  `CjsAudioMan`'s structural provider contract;
- appfileindex and resfileindex parsing, discovery, immutable lookup, named
  overlays, and safe HTTP(S) source resolution;
- provider-neutral chat-room selection, browser-local filtering, disposable
  room listeners, and consumption of server-resolved presentation assets;
- Carbon realtime v1 message validation, WebSocket consumption, exact
  subscriptions, bounded hello/request/pressure behavior, reconnect
  classification, secret-safe metrics, capability replacement, and snapshot
  recovery;
- a narrow side-effect-free Carbon realtime v1 wire subpath shared with Node
  protocol consumers without sharing server implementations;
- caller-injected WebSocket, Fetch, and related browser capabilities.

Future demos, inspectors, loaders, and integration helpers may join when they
provide a usable browser-facing outcome.

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
  mechanics belong in `@carbonenginejs/runtime-utils`.
- Runtime graph objects and domain readers belong in their owning
  `runtime-*` packages.
- Audio event interpretation, decoded-buffer caching, scheduling, and playback
  semantics belong in `@carbonenginejs/runtime-audio`.
- Audio document construction, event/media selection, WEM preparation,
  decoded-buffer retention, and playback belong in
  `@carbonenginejs/runtime-audio`.
- Physical audio-byte resource ownership belongs in
  `@carbonenginejs/runtime-resource`.
- BNK/WEM parsing and conversion belong in
  `@carbonenginejs/runtime-resource`.
- Node filesystems, acquisition caches, provider credentials, servers,
  command-line interfaces, and build orchestration belong in
  `@carbonenginejs/tools-core`.
- Textures, buffers, pipelines, and backend realization belong in `engine-*`
  packages.

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

Source is side-effect-free by public subpath and uses standard ECMAScript plus
Web APIs. Browser globals may be replaced with injected implementations for
offline tests and compatible non-browser hosts.

## Related documentation

- [Package documentation](README.md)
- [Audio-library guide](guides/audio-libraries.md)
- [Chat guide](guides/chat.md)
- [File-index guide](guides/file-indexes.md)
- [Realtime guide](guides/realtime.md)
- [Class-purpose catalog](reference/classes/README.md)
