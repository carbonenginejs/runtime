# Browser tools documentation

Status: Evolving  
Scope: `@carbonenginejs/tools-browser`  
Audience: Browser application authors, integrators, and maintainers  
Summary: Explains the browser-facing toolbox, its current clients, and its boundary with runtime and Node packages.

## Purpose

`@carbonenginejs/tools-browser` is the intentionally broad home for usable
browser-facing CarbonEngineJS tools. It may contain clients, remote readers,
inspectors, demos, integration helpers, and reference implementations that are
valuable to library users without belonging in runtime packages.

The package is broad by product shape, not boundaryless. Its published source
uses browser-standard or injected Web APIs and never imports Node built-ins.

## Use this package when

Use `tools-browser` when code:

- provides a usable browser-side integration or developer tool;
- reads caller-selected remote data through browser-safe interfaces;
- can also run in a Node test host through standard or injected Web APIs;
- does not own runtime graph objects, domain schemas, or backend realization.

Move a small general primitive down to `runtime-utils` when several runtime
packages need it. Keep filesystem, cache, credential, server, command-line, and
build behavior in the Node toolchain.

## Where it fits

```text
runtime-utils
      ^
      |
tools-browser
      ^
      +---- browser applications
      +---- demos and inspectors
      +---- tools-core wrappers using injected Web APIs
```

The current package depends only on `@carbonenginejs/runtime-utils`. Its first
public families are remote file-index handling and the Carbon realtime v1
client.

## Start here

For file-index parsing and safe HTTP(S) resolution, start with:

```js
import {
    CjsFileIndex,
    CjsFileIndexSource
} from "@carbonenginejs/tools-browser/fileindex";
```

For a reconnecting realtime consumer, start with:

```js
import {
    CjsRealtimeClient
} from "@carbonenginejs/tools-browser/realtime";
```

The package remains private until its dependency and consumer migrations are
complete.

## Documentation map

- [Architecture and boundaries](architecture.md)
- [File-index guide](guides/file-indexes.md)
- [Realtime guide](guides/realtime.md)
- [Current API reference](reference/api.md)
- [Class-purpose catalog](reference/classes/README.md)
