# Runtime architecture

Status: Experimental
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors, engine authors, and maintainers
Summary: Defines the accepted dependency direction and ownership boundaries for the combined runtime.

## Purpose

The combined runtime keeps the donor packages' useful dependency barriers
inside one package. [`layers.json`](../layers.json) is the executable rule set:
every internal source layer has an exhaustive import allow-list, and aggregate
entry points have separately constrained surfaces.

## Layers

The package holds `global`, `resource`, `trinityal` (the abstraction layer and
its headless stub), `trinity`, `sof`, `audio`, `character`, `input`,
`trinityal/webgpu`, `core` and `tools`. `trinityal/webgpu` and `tools` are
subpaths outside the aggregate root; the demo suite is `@carbonenginejs/demos`.

## Dependency direction

```text
global  (utils, math, consts, imageio, compose, schema, model, contracts, blue)
   |
   +-- resource
   |      |
   |      +-- sof, audio
   |
   +-- trinityal (AL + stub)
   |      |
   |      +-- trinity  (global, resource, trinityal)
   |             |
   |             +-- character
   |             +-- trinityal/webgpu  (global, resource, trinity, trinityal)
   |
   +-- input
   |
   +-- core  (may import every layer above)

tools  (global/utils only)
```

`layers.json` is authoritative for each permitted edge; the diagram is a
guide. `sof` does not import `trinity`: its output names runtime identities
that a consumer resolves. `trinity` renders through `trinityal`, which runs
headless on the stub until a backend such as `trinityal/webgpu` is installed.

## Contracts and engines

`global/contracts` owns dependency-floor base classes for organization-owned
execution interfaces. It imports only schema metadata so a required root method
can carry abstract implementation metadata and throw until a subclass overrides
it. Owned consumers call required methods directly; optional chaining and
structural method probes are not substitutes for a required organization-owned
method.

Renderer engines are sibling implementations, not subclasses of a shared
WebGL-shaped device or RHI. An engine may extend the canonical base classes and
import resource and Trinity identities. It never imports `core`, browser tools,
or a sibling engine, and live GPU objects remain engine-owned.

WebGPU is exposed through `@carbonenginejs/runtime/trinityal/webgpu`.
No WebGL export or placeholder is added before a maintained implementation exists.

`@carbonenginejs/runtime/core` may import every layer, but holds no service
composition today (`CjsLibrary` is empty on purpose; its head comment says
why). It carries the browser platform and adapter snapshots, also at
`/core/platform`; importing it probes no browser globals.

## Trinity to WebGPU draw path

Trinity renders through an abstraction-layer (AL) context installed with
`Tr2RenderContext.SetRenderContextAL`; without one it uses the headless stub.
The WebGPU implementation, `CjsWebgpuRenderContextAL`, is internal and reached
through the private build entry, not the package root. The public
`trinityal/webgpu` descriptor API is a separate surface, not a way to install
the AL.

1. Trinity's `RenderBatchesInOrder` walks the finalized accumulator, applies
   standard states, per-object constants, shader pass state and material data,
   then calls `SubmitGeometry`. The AL receives binding and draw calls, not
   batches to resolve later. A mesh batch's geometry descriptor is realized
   into suballocated buffers at its first submit through that context.
2. AL setters retain the bound program, render state, declaration, streams and
   resources. Each draw's `EmitRenderPipelineState` resolves the accumulated
   description and reuses a cached pipeline or creates one synchronously. A
   draw whose state cannot be honoured is refused, so this path does not by
   itself show that every Carbon rendering feature is implemented.
3. `CjsWebgpuResourceSetAL` resolves stage/register bindings for the linked
   program at draw time. Constant buffers keep CPU shadows; the frame's
   constant arena supplies upload regions and dynamic offsets. Texture views
   are made on first bind; a slot with no created texture binds a dummy.
4. `BeginScene` opens the command encoder, resets the constant arena and the
   bound render targets. The work queue opens passes lazily and applies
   render-pass hints; the canvas view is acquired at the first pass and shared
   by the frame's later passes.
5. `EndScene` closes the last pass, clears the bound program, resource set and
   vertex layout, then finishes and submits the command encoder. It is
   synchronous; the browser presents the canvas after that submission.

Source owners: `src/trinity/core/context/Tr2RenderContext.js`,
`src/trinityal/webgpu/CjsWebgpuRenderContextAL.js`,
`src/trinityal/webgpu/CjsWebgpuResourceSetAL.js` and
`src/trinityal/webgpu/core/CjsWebgpuWorkQueue.js`.

## Tools, demos, and generated source

`src/tools` holds the browser-safe file-index readers, off the default
surface. Engine-specific GPU harnesses stay with their engine layer.

`@carbonenginejs/tools-core` owns source generators, acquisition-aware artifact
builders, schemas, catalogs, caches, and Node.js/native dependencies.
Browser-safe deterministic value builders may stay with their runtime format
or domain, as audio's optional library builder does. Reviewed runtime-generated
source lives under its owning `src/**/generated`; build inputs are not runtime dependencies.
