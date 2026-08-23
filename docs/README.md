# Runtime documentation

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, integrators, and maintainers
Summary: Explains the unpublished combined-runtime destination and routes readers to its current structural contract.

## Purpose

`@carbonenginejs/runtime` is the accepted consolidation destination for the
browser-safe CarbonEngineJS runtime family, renderer engines, and browser-safe
tools. The repository currently owns only the executable dependency-layer
contract and migration metadata; maintained runtime implementations still live
in their donor repositories until imported with history.

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

No maintained named source classes exist in this scaffold. Planned API
examples are intentionally deferred until their donor implementation and
public export have landed together.

## Documentation map

- [Architecture and layer ownership](architecture.md)
- [Repository migration procedure](../migration/README.md)
- [Machine-readable layer contract](../layers.json)
- [Machine-readable donor manifest](../migration/sources.json)
