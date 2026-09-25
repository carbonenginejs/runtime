# Core class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes under `src/`, `src/resource`, and `src/resource/format/`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for the resource manager, registry, resource, source, and format/probe base classes.

<!-- class:CjsFormatRoute -->
## `CjsFormatRoute`

One registered route: an extension, the format that reads it, the reader to call, and the output to ask for.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/CjsFormatStore.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFormatStore -->
## `CjsFormatStore`

The link between a resource and the formats that can populate it.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/CjsFormatStore.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsLoadingObject -->
## `CjsLoadingObject`

Resource-compatible handler whose public loading result is the constructed object produced by an extension route.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/CjsLoadingObject.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMotherLode -->
## `CjsMotherLode`

Strong, deterministic JavaScript resource registry.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/CjsMotherLode.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsResMan -->
## `CjsResMan`

GPU-free resource manager that resolves paths through registered sources and formats, publishes canonical resources into a `CjsMotherLode` registry under exact-owner generation guards, and drives the main/background work queues, read-operation caching, reload staging, and automatic purge policy.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/CjsResMan.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsResManFetchProvider -->
## `CjsResManFetchProvider`

`CjsResMan` provider that fetches an already-resolved URL on the caller thread or through the resource worker.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/CjsResManFetchProvider.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsResManWorkQueue -->
## `CjsResManWorkQueue`

Small FIFO executor used inside `CjsResMan` that tracks item ids, pause state, concurrency, cancellation, and sync/async completion while queue policy stays in the manager.

- Source: `src/global/blue/CjsResManWorkQueue.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsResource -->
## `CjsResource`

ResMan-owned runtime resource.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/CjsResource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsResManMainThreadLoader -->
## `CjsResManMainThreadLoader`

Direct execution strategy that reads through a structural source and invokes registered format facades on the caller thread.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/worker/CjsResManMainThreadLoader.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsResManWorker -->
## `CjsResManWorker`

Static browser-worker host that owns its operation/message vocabulary, executes clone-safe source and format operations, installs the message envelope, transfers owned buffers, and serializes failures for `CjsResMan`.

- Export: `@carbonenginejs/runtime/resource/worker`
- Source: `src/global/blue/worker/CjsResManWorker.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsResManWorkerLoader -->
## `CjsResManWorkerLoader`

Browser module-worker strategy that correlates source/format requests, transfers owned buffers, propagates cancellation and fatal failure, and delegates unsupported operations to a main-thread loader.

- Export: `@carbonenginejs/runtime/global`
- Source: `src/global/blue/worker/CjsResManWorkerLoader.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsCarbonEffectBodyReader -->
## `CjsCarbonEffectBodyReader`

Plain byte cursor over one description blob, carrying the Carbon effect error class and message.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/carbonEffect/CjsCarbonEffectReader.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsCarbonEffectReader -->
## `CjsCarbonEffectReader`

Reader for Carbon's compiled-effect container, versions 8 through 15.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/carbonEffect/CjsCarbonEffectReader.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsCarbonEffectWriter -->
## `CjsCarbonEffectWriter`

Builder for a Carbon compiled-effect container.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/carbonEffect/CjsCarbonEffectWriter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsBitReader -->
## `CjsBitReader`

LSB-first bit cursor over a byte range.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsBitReader.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsBlueReader -->
## `CjsBlueReader`

Shared output and hydration backend for Blue persistence readers.

- Source: `src/resource/format/CjsBlueReader.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsByteReader -->
## `CjsByteReader`

Little-endian cursor over resource bytes, with optional string-table arena resolution.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsByteReader.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsByteWriter -->
## `CjsByteWriter`

Growable little-endian append cursor with reserve-and-patch support.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsByteWriter.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFormat -->
## `CjsFormat`

Decorator-free base for every concrete format facade.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/format/CjsFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFormatRangeError -->
## `CjsFormatRangeError`

Error raised when a read would run past the end of its source.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsFormatError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFormatReadError -->
## `CjsFormatReadError`

Error raised when shared binary format bytes cannot be decoded safely.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsFormatError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFormatWriteError -->
## `CjsFormatWriteError`

Error raised when shared binary format bytes cannot be encoded safely.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsFormatError.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsGeometryFormat -->
## `CjsGeometryFormat`

The base of every geometry format (gr2, cmf, fbx, obj, stl, gltf): the geometry media type and the node-class registry that lets a caller hydrate a read into its own constructors instead of plain JSON.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsGeometryFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsImageFormat -->
## `CjsImageFormat`

The base of every image format: it gives each subclass Carbon's image-handler table and the step that turns a native read into the format a caller asked for.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsImageFormat.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsReader -->
## `CjsReader`

Internal base for construction-bound readers.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsReader.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsResourceProbe -->
## `CjsResourceProbe`

A format support report, normalized.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/format/CjsResourceProbe.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsStringTable -->
## `CjsStringTable`

Carbon's compiled-effect string table: a deduplicated blob arena whose offsets are assigned by a bytewise sort rather than by insertion order.

- Export: `@carbonenginejs/runtime/resource/format`
- Source: `src/resource/format/CjsStringTable.js`
- Visibility: Public
- Kind: Carbon

<!-- class:ImageIO -->
## `ImageIO`

Carbon's `ImageIO` registry and entry points (imageio/Tr2ImageHandler.cpp).

- Export: `@carbonenginejs/runtime/resource/imageio`
- Source: `src/resource/imageio/ImageIO.js`
- Visibility: Public
- Kind: Carbon
