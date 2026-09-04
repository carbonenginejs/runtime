# Runtime documentation

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, integrators, and maintainers
Summary: Explains the consolidated private runtime and routes readers to its current structural contract.

> **This tree is the package's PUBLIC documentation. It ships inside the npm
> artifact**, so it carries nothing private — no machine paths, no credentials,
> no internal-only material — and it describes what the shipped package does:
> its concepts, references, guides and published roadmap.
>
> Internal decisions, direction and research are kept separately and are not in
> this tree. The two are split by audience, not by topic, which means **a
> question can be owned here and be invisible from there, and the reverse**. If
> you are looking for what this package does or refuses to do, this tree is
> authoritative — check it before concluding a page does not exist.

## Purpose

`@carbonenginejs/runtime` is the consolidated source package for the
browser-safe CarbonEngineJS runtime family, renderer engines, and browser-safe
tools. The repository owns the executable dependency-layer contract, migration
metadata, the maintained global foundation, the resource/format capability,
the Trinity/EVE object graph, the standalone SOF builder and data model, the
complete headless-by-default audio domain, and the GPU-free character domain.
The browser host-window and input adaptation layer is also maintained here.
The WebGPU renderer is maintained as an explicit, opt-in engine subpath.
The GPU-free composition core and its browser platform snapshots are maintained
here as well. Browser-safe clients, inspectors, UI, and demo composition are
maintained under the explicit `/tools` surface.

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

The global foundation, resource capability, Trinity graph, SOF layer, audio
domain, character domain, input layer, WebGPU engine, composition core, and
browser tools are
now maintained source in this repository.
Foundation, lifecycle, format, FSD, shader-translation, resource, Trinity, SOF,
audio, character, input, WebGPU, core, and tools tests run as part of the
combined suite.

## Documentation map

- [Architecture and layer ownership](architecture.md)
- [Global foundation](global/README.md)
- [Resource capability](resource/README.md)
- [Trinity and EVE graph](trinity/README.md)
- [SOF builder and data model](sof/README.md)
- [Audio graph and Web Audio realization](audio/README.md)
- [Character documents and native graph](character/README.md)
- [Input and browser host adapters](input/README.md)
- [WebGPU engine](engine/webgpu/README.md)
- [Core composition and platform capabilities](core/README.md)
- [Browser-safe tools and demos](tools/README.md)
- [Repository migration procedure](../migration/README.md)
- [Machine-readable layer contract](../layers.json)
- [Machine-readable donor manifest](../migration/sources.json)
