# Runtime documentation

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, integrators, and maintainers
Summary: Explains the consolidated private runtime and routes readers to its current structural contract.

> **This PUBLIC documentation ships inside the npm artifact:** no machine
> paths, credentials, or internal-only material. It owns the shipped package's
> concepts, references, guides, roadmap, and supported or refused behavior.
> Internal decisions, direction, and research live separately. The split is by
> audience, not topic: check both trees before concluding a question has no owner.

## Purpose

`@carbonenginejs/runtime` consolidates the browser-safe runtime, its executable
layer contract, and migration metadata. Maintained domains include the global
foundation, resource/formats, Trinity/EVE graphs, standalone SOF,
headless-by-default audio, CPU/data character with isolated appearance backends,
GPU-free composition, browser platform snapshots, and host-window/input adapters.
WebGPU is an explicit opt-in subpath. The residual `/tools` surface owns
browser-safe file-index helpers; demo UI and the realtime client moved to
`@carbonenginejs/demos` (see [Tools](tools/README.md)).

## Use this package when

Source consolidation completed on 2026-08-23. Maintainers use this repository
to validate the combined layer graph and prepare the coordinated consumer,
registry, and first-release cutover. Registry consumers continue using the
published donor packages until that cutover.

After cutover, consumers will use focused runtime subpaths for math, schemas,
resources, Trinity graphs, SOF, audio, character behavior, input, composition,
an explicitly selected renderer engine, or browser-safe tools.

## Where it fits

The dependency floor is `global`, including dependency-free nominal contracts.
Resource and domain layers build above that floor. WebGPU and any future WebGL
implementation are sibling engine layers below `core`; they may consume
canonical resource and Trinity identities but never import `core`, browser
tools, or one another. `core` composes the lower layers. Browser-safe `tools`
sit at the top and remain off the default surface.

`@carbonenginejs/tools-core` stays separate because it owns Node.js and native
build-time work. It may generate reviewed source artifacts for this package,
but it is not a runtime dependency.

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
- [Global foundation](global/README.md)
- [Resource capability](resource/README.md)
- [Trinity and EVE graph](trinity/README.md)
- [SOF builder and data model](sof/README.md)
- [Audio graph and Web Audio realization](audio/README.md)
- [Character documents and native graph](character/README.md)
- [Input and browser host adapters](input/README.md)
- [WebGPU abstraction layer](trinityal/webgpu/README.md)
- [Core composition and platform capabilities](core/README.md)
- [Browser-safe file-index tools and migration routes](tools/README.md)
- [Repository migration procedure](../migration/README.md)
- [Machine-readable layer contract](../layers.json)
- [Machine-readable donor manifest](../migration/sources.json)
