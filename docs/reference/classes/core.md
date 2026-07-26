# Core class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource` classes under `src/`, `src/resource`, and `src/format/`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for the resource manager, registry, resource, source, and format/probe base classes.

<!-- class:CjsMotherLode -->
## `CjsMotherLode`

Strong, deterministic resource registry that owns canonical path/variant identities and evicts entries only through explicit ownership removal, inactivity sweeps, or recorded-byte cache trimming, replacing Carbon's weak-live/strong-cache ownership transition.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/CjsMotherLode.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:CjsResMan -->
## `CjsResMan`

GPU-free resource manager that resolves paths through registered sources and formats, publishes canonical resources into a `CjsMotherLode` registry under exact-owner generation guards, and drives the main/background work queues, read-operation caching, reload staging, and automatic purge policy.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/CjsResMan.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:CjsResManWorkQueue -->
## `CjsResManWorkQueue`

Small FIFO executor used inside `CjsResMan` that tracks item ids, pause state, concurrency, cancellation, and sync/async completion while queue policy stays in the manager.

- Export: None
- Source: `src/CjsResManWorkQueue.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsResource -->
## `CjsResource`

Base runtime resource handle that carries normalized path/extension/requirement identity, load state, and an attached CPU payload, with manager lifecycle callbacks supplied by `CjsResMan` after canonical insertion.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resource/CjsResource.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:CjsResManMainThreadLoader -->
## `CjsResManMainThreadLoader`

Direct execution strategy that reads through a structural source and invokes registered format facades on the caller thread.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/worker/CjsResManMainThreadLoader.js`
- Visibility: Public
- Kind: Adapted ccpwgl loader strategy

<!-- class:CjsResManWorkerLoader -->
## `CjsResManWorkerLoader`

Browser module-worker strategy that correlates source/format requests, transfers owned buffers, propagates cancellation and fatal failure, and delegates unsupported operations to a main-thread loader.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/worker/CjsResManWorkerLoader.js`
- Visibility: Public
- Kind: Adapted ccpwgl loader strategy

<!-- class:CjsResManWorker -->
## `CjsResManWorker`

Static browser-worker host that owns its operation/message vocabulary, executes clone-safe source and format operations, installs the message envelope, transfers owned buffers, and serializes failures for `CjsResMan`.

- Export: `@carbonenginejs/runtime-resource/worker`
- Source: `src/worker/CjsResManWorker.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsResManFetchProvider -->
## `CjsResManFetchProvider`

`CjsResMan` provider that fetches an already-resolved URL on the caller thread or through the resource worker.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/CjsResManFetchProvider.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsBlueReader -->
## `CjsBlueReader`

Shared output and hydration backend for Blue persistence readers that owns common payload/runtime targets, reference emission, hydration adapter phases, reports, finalization, and schema-descriptor helpers, while transports keep framing and member decoding.

- Export: None
- Source: `src/format/CjsBlueReader.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsFormat -->
## `CjsFormat`

Base class for format readers that defines the static `read`/`readAsync`/`isSupported`/`resolveType` contract and instance option handling that concrete format packages implement.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/format/CjsFormat.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class

<!-- class:CjsReader -->
## `CjsReader`

Internal base for construction-bound readers that are created for one source and dropped after use, relying on garbage collection instead of explicit dispose/clear cleanup.

- Export: None
- Source: `src/format/CjsReader.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsResourceProbe -->
## `CjsResourceProbe`

Standard probe-report model that formats return from inspection, recording support status, content-verification state, confidence, preferred route, capability variants, warnings, and errors without choosing an engine or media backend.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/format/CjsResourceProbe.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class
