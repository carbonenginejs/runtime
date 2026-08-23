# Runtime documentation

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, integrators, and maintainers
Summary: Explains the unpublished combined-runtime destination and routes readers to its current structural contract.

## Purpose

`@carbonenginejs/runtime` is the accepted consolidation destination for the
browser-safe CarbonEngineJS runtime family, renderer engines, and browser-safe
tools. The repository owns the executable dependency-layer contract, migration
metadata, the maintained global foundation, the resource/format capability,
the Trinity/EVE object graph, the standalone SOF builder and data model, the
complete headless-by-default audio domain, and the GPU-free character domain.
Remaining donor implementations
stay under temporary prefixes until each reviewed source family is moved into
its final layer.

## Use this package when

Current maintainers use this repository to validate the combined layer graph
and to perform the history-preserving migration. Consumers continue using the
published donor packages until the coordinated cutover.

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
domain, and character domain are now maintained source in this repository.
Foundation, lifecycle, format, FSD, shader-translation, resource, Trinity, SOF,
audio, and character tests run as part of the combined suite. Other runtime
layers remain inert until their reviewed donor moves land.

## Documentation map

- [Architecture and layer ownership](architecture.md)
- [Global foundation](global/README.md)
- [Resource capability](resource/README.md)
- [Trinity and EVE graph](trinity/README.md)
- [SOF builder and data model](sof/README.md)
- [Audio graph and Web Audio realization](audio/README.md)
- [Character documents and native graph](character/README.md)
- [Repository migration procedure](../migration/README.md)
- [Machine-readable layer contract](../layers.json)
- [Machine-readable donor manifest](../migration/sources.json)
