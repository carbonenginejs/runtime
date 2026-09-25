# Runtime documentation

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, integrators, and maintainers
Summary: Explains the consolidated private runtime and routes readers to its current structural contract.

> **This PUBLIC documentation ships inside the npm artifact:** no machine
> paths, credentials, or internal-only material. It owns the shipped package's
> concepts, references, guides, and supported or refused behavior.
> Internal decisions, direction, and research live separately. The split is by
> audience, not topic: check both trees before concluding a question has no owner.

## Purpose

`@carbonenginejs/runtime` consolidates the browser-safe runtime, its executable
layer contract, and migration metadata. Maintained domains include the global
foundation, resource/formats, Trinity/EVE graphs, standalone SOF,
headless-by-default audio, CPU/data character with isolated appearance backends,
browser platform snapshots, and host-window/input adapters.
WebGPU is an explicit opt-in subpath. The residual `/tools` surface owns
browser-safe file-index helpers; demo UI and the realtime client moved to
`@carbonenginejs/demos`.

## Use this package when

Use its focused subpaths for math, schemas, resources and formats, Trinity
graphs, SOF, audio, character behavior, input, an explicitly selected renderer
backend, or the file-index tools.

## Where it fits

The dependency floor is `global`. Resource and domain layers build above it;
Trinity renders through the `trinityal` abstraction layer, headless on its stub
until a backend such as `trinityal/webgpu` is installed. Backends may consume
resource and Trinity identities but never import `core` or one another.
`core` may import every layer; `tools` imports only `global/utils` and stays
off the default surface. [Architecture](architecture.md) has the diagram.

`@carbonenginejs/tools-core` stays separate because it owns Node.js and native
build-time work. It may generate reviewed source artifacts for this package,
but it is not a runtime dependency.

## Where data comes from

The runtime never requires a particular server. Any data-backed capability
works in one of four ways, and the caller chooses:

1. **Browser only.** The runtime fetches what it needs itself, with no build
   step and no service.
2. **Prebuilt payload.** The caller hands over an already-built document, and
   nothing is fetched.
3. **Injected getter.** The caller supplies the resource getter (one
   asynchronous `Fetch(resPath)`), backed by any service or cache.
4. **Injected local reader.** The caller keeps the resource manager's whole
   pipeline (routes, formats, workers, caching) and swaps only its byte
   source: `blue.resMan.Register({ source })` with any object that has
   `Read(path, options)`. This is how a Node.js tool reads from a local disk;
   the reader belongs to the caller, so the runtime itself stays free of
   Node.js code.

The resource manager lives in Blue and always exists as `blue.resMan`. A
composing wrapper configures it (sources, paths, which formats and resource
classes to register) according to what its environment offers; it does not
have to create it. `@carbonenginejs/tools-core` is one possible data provider,
never a requirement.

## Start here

Run the current structural checks from the repository root:

```sh
npm test
```

The combined suite covers foundation, lifecycle, format, FSD,
shader-translation, resource, Trinity, SOF, audio, character, input, WebGPU,
core, and tools.

## Documentation map

- [Architecture and layer ownership](architecture.md)
- [Resource formats: map, import rule, writers](resource/formats/README.md)
- [SOF builder and data model](sof/README.md)
- [Audio: browser playback](audio/guides/browser-playback.md)
- [Character: runtime usage](character/guides/runtime-usage.md)
- [Trinity to WebGPU draw path](architecture.md#trinity-to-webgpu-draw-path)
- [WebGPU class catalog](trinityal/webgpu/reference/classes/README.md)
- [Repository migration procedure](../migration/README.md)
- [Machine-readable layer contract](../layers.json)
- [Machine-readable donor manifest](../migration/sources.json)
