# Runtime architecture

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, and maintainers
Summary: Defines the accepted dependency direction and ownership boundaries for the combined runtime.

## Purpose

The combined runtime preserves the donor packages' useful dependency barriers
inside one package. [`layers.json`](../layers.json) is the executable contract:
every internal source layer has an exhaustive import allow-list, and aggregate
entry points have separately constrained surfaces.

## Current structure

The repository currently contains the maintained global foundation, inert entry
points for the remaining accepted layers, the layer checker, a donor manifest,
and all ten unsquashed donor histories under temporary prefixes. The package is
private and no engine subpath is public.

## Planned dependency direction

```text
global/{utils,math,consts,contracts,schema,model}
                         |
                      resource
                    /    |    \
              trinity   sof   audio   character   input
                    \     |     /        /          /
                         engine/webgpu
                              |
                             core
                              |
                            tools
```

The diagram is a compact ownership guide; `layers.json` is authoritative for
each exact permitted edge. Domain layers may use only the lower capabilities
listed for them. `sof` does not import `trinity`; its declarative output names
runtime identities that composition resolves later.

## Contracts and engines

`global/contracts` owns dependency-free base classes for organization-owned
execution contracts. A required base method throws until an implementation
overrides it. Composition validates required identities once, then hot paths
call them directly. Optional chaining and structural method probes are not
substitutes for a required organization-owned contract.

Renderer engines are sibling implementations, not subclasses of a shared
WebGL-shaped device or RHI. An engine may extend canonical contracts and import
resource and Trinity identities. It never imports `core`, browser tools, or a
sibling engine, and live GPU objects remain engine-owned.

The maintained WebGPU implementation will become an explicit subpath only
after its donor source and tests are migrated. No WebGL export or placeholder
is added before a maintained WebGL implementation exists.

## Tools, demos, and generated source

Browser-safe reusable helpers migrate from `tools-browser` into `src/tools`
and stay off the default export surface. Standalone non-engine examples live
under the repository-root `demo/` directory. Engine-specific GPU harnesses stay
with their engine layer.

Generators, builders, schemas, catalogs, acquisition, and Node.js or native
dependencies remain in `@carbonenginejs/tools-core`. Reviewed generated source
required at runtime lives beneath its owning layer under
`src/**/generated`; build inputs do not become runtime dependencies.

## Migration constraint

Every donor enters under a temporary prefix through a non-squashed Git subtree
import. Ordinary commits then move reviewed files into final layer paths. Plain
filesystem copies and squashed imports are prohibited because they discard the
origin history needed for provenance and future archaeology.

Consumer changes remain atomic and occur only after the combined package
passes the donor baselines and the final package boundary is reviewed.
