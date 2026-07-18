# @carbonenginejs/runtime-core

GPU-free CarbonEngineJS composition root and runtime service registry.

This package is JavaScript-only and provides the `CjsLibrary` composition
boundary. It accepts resource, SOF, device, audio, and input services without
creating or interpreting backend objects.

```js
import CjsLibrary, { CjsServiceKey } from "@carbonenginejs/runtime-core";

const library = new CjsLibrary({
  resourceManager,
  spaceObjectFactory: eveSof,
  services: {
    [CjsServiceKey.AUDIO_SYSTEM]: audioSystem,
    [CjsServiceKey.INPUT_MANAGER]: inputManager
  }
});

library.Register({
  capabilities: { webgpu: true },
  behaviors: {
    webgpu_eve_space_object_main: {
      behavior: webgpuMainBehavior,
      default: true,
      priority: 100
    }
  },
  resMan: optionsForResMan,
  sof: optionsForSof
});

await library.InitializeAsync({ dataPath: "res:/sof/data.black" });
const shipDocument = await library.Fetch("rifter:minmatar:minmatar");
```

`CjsLibrary.Register({ resMan })` and `CjsLibrary.Register({ sof })` forward the
exact topic options to each configured service's own `Register` method. A
standalone `CjsResMan` or `EveSOF` therefore uses the same configuration shape
as one composed by the library.

## CjsLibrary responsibilities

`CjsLibrary` is the runtime composition and request-policy boundary. For direct
resource paths it is responsible for:

- registering the resource manager, source, resource classes, formats, queue
  scheduler, and default behavior supplied by the
  application/client preset;
- collecting capability reports from registered device/engine and conversion
  services without owning their backend objects;
- selecting the requested semantic result before calling `CjsResMan`, such as
  `requirement`, `emit`, and explicit format;
- starting from registered defaults and applying explicit `Get`/`Fetch`
  request options as overrides;
- forwarding the resolved path and options to `CjsResMan` and returning its
  shared `CjsResource` or object result;
- exposing the application composition/initialization boundary while injected
  services retain ownership of their queues and backend lifecycles;
- keeping direct resource-path requests separate from SOF DNA requests.

### Renderer composition

One `CjsLibrary` instance has one active renderer backend. Its singular
`CjsServiceKey.DEVICE`, capability snapshot, and default behaviors describe
that renderer session. CjsLibrary does not keep
WebGL and WebGPU active together and does not hot-switch a live backend.

An application that needs both creates two libraries: one configured for WebGL
and one for WebGPU. Each normally receives its own logical `TriDevice`,
backend executor, concrete engine device, and resource manager/prepared
outcomes. The renderer/frame driver supplies one or more engine-agnostic
`Tr2RenderContext` instances for its cameras and passes; CjsLibrary composes
the renderer but does not semantically own those contexts. Sharing immutable
source acquisition or CPU caches may be added explicitly, but sharing a
resource manager requires unique device-bound adapter keys.

`TriDevice` remains a GPU-free Carbon-facing model/facade; it is not the base
class of `CjsWebGLDevice` or `CjsWebGPUDevice`. Native handles and backend
lifecycle remain in the selected engine service.

The default relationship is:

```text
application/client configuration
        |
        v
CjsLibrary registers default services and behavior
        |
        | path request + optional overrides
        v
CjsLibrary selects the promised CPU output
        |
        | requirement / emit / format
        v
CjsResMan reads, converts, publishes, caches, and returns the CPU resource
```

The concrete direct-path workflow is:

```text
CjsLibrary.GetResource("res:/effect/ship.cewgpu", request overrides)
        |
        v
ResolveResourceRequest
  |- start with registered resourceDefaults
  |- match default behaviors against the path + registered capabilities
  |- select the unique highest-priority match
  |- apply behavior request recipe
  `- apply caller overrides last
        |
        | resolved path + requirement/format/emit
        v
CjsResMan.GetResource
  |- resolve one MotherLode identity from the final outcome options
  |- share an existing resource/source read when identities permit
  |- read source bytes
  |- use the requested/registered format reader
  `- validate/publish the final CjsResource payload or object
        |
        v
CjsLibrary returns the shared CjsResource handle (or Fetch* promise result)
```

If no behavior matches, `resourceDefaults` plus caller options are forwarded.
`CjsResMan` uses the reader for the resolved format/extension and publishes its
declared CPU output. It does not infer or execute a device conversion. A caller
can select a named behavior with `behavior: "name"`, or disable behavior
selection for one request with `behavior: false`.

Behavior descriptors are structural plain objects rather than DTOs. Their
optional synchronous `CanResolveResourceRequest(context)` method sees the
registered capability snapshot. Their `request` recipe and optional
`ResolveResourceRequest(context)` result may rewrite the path or supply request
options. Engine-owned methods such as `BuildUniformData` remain on the behavior
record and are never passed to `CjsResMan`.

Request precedence is:

```text
resourceDefaults < behavior recipe/result < caller options < path @output
```

`formatOptions` is shallow-merged at each level. Default matches with equal
highest priority, unknown explicit behavior names, malformed results, and
asynchronous resolvers fail closed. Resolution remains synchronous so
`GetResource` can return its immediate MotherLode handle.

For testing and diagnostics, a terminal `@output` suffix forces the promised
result without changing the source filename or extension:

```js
const cmfFromGr2 = await library.Fetch("res:/ship.gr2@cmf");
const resInDefaultFormat = await library.Fetch("res:/ship.gr2");
const resInForcedFormat = await library.Fetch("res:/ship.gr2@gr2");
```

CjsLibrary strips the suffix and forwards `variant` plus `emit` to ResMan. The
registered format class must declare the requested normal or diagnostic output;
matching is case-insensitive, and ResMan restores the declaration's canonical
spelling before calling the reader. A legacy direct object loader exposes only
an unforced default; named output variants belong on a format class. An
unsupported tag rejects the fetch. Normal application requests should generally
omit the suffix and use the library-selected default.

For example, a behavior can select the normal promised CPU output while a
diagnostic request uses the explicit `@output` override:

```js
library.Register({
  behaviors: {
    geometry: {
      behavior: {
        request: { requirement: "geometry", emit: "cmf" }
      },
      default: true
    }
  }
});

const normal = library.FetchResource("res:/model/ship.gr2");
const diagnosticGr2 = library.Fetch("res:/model/ship.gr2@gr2");
```

`CjsLibrary` does not read source bytes, run format decoding, validate resource
payload fields, manage the MotherLode, or create GPU objects. Those remain the
responsibilities of `runtime-resource`, format handlers, and engine adapters.
It selects among registered behavior; it must not hard-code device support
inside `CjsResMan`.

Current implementation status: service/capability registration, resource
defaults, named behavior selection, path rewriting, exact option resolution,
and the `GetResource`/`GetObject`/`Fetch*` facades are implemented. Device and
engine services must register their already-probed capability reports before a
synchronous request; asynchronous probing/aggregation and frame scheduling
remain application/backend work.

`GetResource` remains an immediate resource-handle API. `FetchResource`,
`FetchObject`, `FetchDNA`, and `Fetch` are promise-facing facades. The current
DNA result is a complete GPU-free `carbon.document`; graph hydration and a
graph-wide resource readiness barrier remain the next composition step.

`runtime-resource` owns resource lifecycle, fetching, caching, probes, plain
payload contracts, and resource-side validation. `runtime-sof` owns DNA
behavior and receives an injected async object resolver. This package does not
create GPU devices or decode media. It may select a presentation recipe from
registered capability reports, but engine/device services own backend probing
and all live backend objects.

## Status

The composition boundary is established; service lifecycle and backend
integration remain incremental work. The old TypeScript barrel has been
removed. New runtime-core code must follow the repository's JS-only ESM
conventions and use `SetValues`/`GetValues`-style APIs where stateful runtime
objects are introduced.

## Verification

```sh
npm test
npm run lint
```
