# @carbonenginejs/runtime-resource

CarbonEngineJS resource lifecycle, cache, format selection, source, and object
loading contracts.

This package owns the GPU-free resource layer:

- `CjsResource` state and Carbon-style resource methods.
- `CjsTextureArrayRes` and `CjsTextureParameterProxy` for material-facing,
  frame-coalesced texture-array inputs without changing ordinary texture
  parameter behavior.
- `CjsMotherLode` cache lookup/insert/delete/stats.
- `CjsResMan` semantic resource construction, registered-format selection,
  layered source/read/resource deduplication, object loader dispatch, and
  prefetch.
- `CjsEventEmitter` from `core-types/model` for manager/runtime events without requiring `CjsModel` inheritance. `CjsEventEmitterScope` is the explicit cleanup ledger for cross-emitter relationships; owner-side `ListenTo` helpers are not part of the current contract.
- Path normalization and extension helpers.
- Source adapters for memory and `fetch`.
- Optional DTO payload carriers for decoded format output under `src/dto`.
- Canonical Carbon resource classes that hold DTO payloads privately:
  `TriTextureRes`, `TriGeometryRes`, `Tr2EffectRes`, `Tr2ImageRes`,
  `TriGrannyRes`, `Tr2GrannyStateRes`, and `Tr2LightProfileRes`.
- Opaque engine-owned subobject slots for backend adapters.
- Format policy, format class contracts, and load/prepare state mapping stay
  inside this package's implementation and public API rather than external
  workspace notes.
- Non-shader format implementations are owned as explicit tree-shakeable
  subpaths under `@carbonenginejs/runtime-resource/formats/<name>`.

It intentionally does not own WebGL/WebGPU realization. Engine packages should adapt prepared resources into backend objects.

Authoring source is decorated JavaScript. Published/consumer output is built ESM in `npm/dist`.

## Package relationships

- `runtime-core` may configure and expose a `CjsResMan`, but does not own its
  implementation.
- `runtime-trinity` and `runtime-sof` may request GPU-free objects and resources
  without selecting an engine.
- `engine-webgpu` and future WebGL engines consume loaded resources and own all
  backend allocations, preparation, replacement, and destruction.

Concrete formats are not imported or registered by the package root:

```js
import { CjsResMan } from "@carbonenginejs/runtime-resource";
import { CjsMp4Format } from "@carbonenginejs/runtime-resource/formats/mp4";

const resMan = new CjsResMan().Register({
  source,
  formats: [ CjsMp4Format ]
});

const resource = resMan.GetResource("res:/video/intro.mp4");
const video = await resource.Ready();
```

Format classes own input extensions. Resource classes are registered by a
semantic requirement, never by file extension:

```js
const resMan = new CjsResMan().Register({
  source,
  formats: [ CjsDdsFormat, CjsPngFormat ],
  resourceTypes: [ TriTextureRes, Tr2ImageRes ]
});

const texture = resMan.GetResource("res:/image/ship.png", {
  requirement: "texture",
  emit: "image"
});
const image = resMan.GetResource("res:/image/ship.png", {
  requirement: "image",
  emit: "image"
});
```

Those are distinct resource identities but share the normalized source-byte
operation. The manager does not expose an extension-to-resource compatibility
registry.

Texture-array resources expose one ordinary-looking proxy per ordered layer:

```js
const textureArray = new CjsTextureArrayRes({
  paths: [
    "res:/detail1.dds",
    "res:/detail2.dds",
    "res:/detail3.dds"
  ],
  layerNames: [ "Detail1Map", "Detail2Map", "Detail3Map" ],
  updateScheduler: resource => frameQueue.add(resource)
});

const detail2 = textureArray.GetLayerParameter(1);
detail2.SetValue("res:/replacement.dds");

detail2.textureRes === textureArray; // true
```

Proxy setters only update their source path and invalidate the parent. The
parent is scheduled once even if several proxies change in the same frame.
The next-frame consumer calls `Update()` or `ConsumeUpdateRequest()` to obtain
one immutable ordered snapshot. Runtime-resource does not know which shader
metadata caused the aggregate request; shader packages and engine adapters map
public parameter names to layer indices.

Public effect parameters remain separate from these internal proxies. Their
authored paths and individual 2D source resources are not replaced by the
aggregate. An engine-owned, non-persisted bridge mirrors public changes into
the fixed internal layers.

Consumed snapshots are explicit in-flight generations. An adapter either
publishes the current candidate atomically, requeues retryable work, or records
failure:

```js
const request = textureArray.ConsumeUpdateRequest();

try {
  const candidate = await adapter.PrepareTextureArray(request);
  const result = textureArray.CommitPreparedAdapterRevision(
    request.revision,
    "webgpu",
    candidate
  );

  // A rejected/stale candidate is destroyed by the commit method by default.
  // The adapter owns disposal of a successfully displaced allocation.
  result.displaced?.destroy();
} catch (error) {
  textureArray.FailUpdateRequest(request.revision, error, { retry: true });
}

await textureArray.Ready(); // the generation requested at call time
```

`SetLayerResource()` attaches a resolved source without rewriting the logical
requested path. `TouchLayer()` invalidates an in-place source revision.
`RetryUpdateRequest()` restores consumed work, and `HandleAdapterLoss()` drops
an unusable adapter allocation and schedules a complete topology rebuild.
Topology-changing snapshots set `topologyChanged: true` and report only valid
current layer indices in `dirtyLayers`.

## Development

Install dependencies and run the non-interactive baseline checks from the
repository root:

```sh
npm install
npm run lint
npm run check
npm test
```

`npm run check` builds the consumer package and proves that decorator metadata
matches between authoring source and built output. `npm test` additionally runs
the complete GPU-free unit suite; it requires no private assets, credentials,
network access, browser, or GPU after dependencies are installed.

See [Runtime Resource Lifecycle](resource-lifecycle.md) for state, retention,
and texture-array generation contracts. See
[Format ownership and fork provenance](FORMAT-PROVENANCE.md) for copied-reader
ownership, licenses, exclusions, and the deferred GR2 migration. Both documents
ship with the published package.

## Provenance

CarbonEngine and Fenris Creations (CCP Games) are named for interoperability
and provenance context. This package contains CarbonEngineJS original resource
infrastructure, CarbonEngine-shaped resource ports, and maintained copies of
the non-shader readers identified in `FORMAT-PROVENANCE.md`. It does not copy
Fenris Creations game assets, proprietary documentation, or shader source.
CarbonEngine and historical JavaScript implementations were used as the
behavioral references described in the package notices.

This project is not affiliated with, endorsed by, or sponsored by CCP Games or
CCP ehf. EVE Online and related marks remain the property of their respective
owners.
