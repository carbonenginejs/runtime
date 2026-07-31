# Writing an engine adapter

Status: Stable
Scope: `@carbonenginejs/runtime-resource`, addressed to engine packages
Audience: Anyone building `engine-webgl`, a second WebGPU engine, or any package that realizes CPU payloads into backend objects
Summary: The coupling rules, the reflection/topology seam, and the two mistakes `engine-webgpu` already made that a second engine must not repeat.

## Read this before writing a second engine

`engine-webgpu` is currently the only engine package. Most of its shape is right
and worth copying. Two things are not, and both are easier to avoid than to undo.
This document exists because the second engine is being written after the first
one's mistakes were diagnosed but before they were fixed.

## The coupling rule

**Engine packages take functions and duck-typed objects. They do not import the
layers above or beside them.**

`engine-webgpu` declares this as a non-goal and holds it: no dependency on
`runtime-core`, `runtime-resource`, or `runtime-trinity`. Three existing seams
show the pattern, and a new engine should reach for one of them rather than
inventing a fourth:

| seam | shape |
|---|---|
| `CjsWebGPUPackage.fromBytes(bytes, { read })` | the format reader arrives as a **function** |
| `CjsWebGPUTrinityBatchDispatcher(hooks)` | `ResolveMaterial` / `ResolveBindings` arrive as **hooks**; the batch is duck-typed on the `Tr2RenderBatch` shape |
| `CjsTextureArrayRes` | the engine calls `ConsumeUpdateRequest()`, prepares a candidate, then `CommitPreparedAdapterRevision()` — **the resource layer owns the state machine and never holds engine code** |

The third is the most instructive. Realization is not a callback the resource
layer fires into the engine; it is a request the engine consumes and a commit it
returns. The engine drives its own frame, which is what an engine must do, while
the resource layer keeps the queue, the revisions, and the failure handling.

## What the resource layer owns

Resource identity, the cache, CPU payload lifecycle, format selection, the
load/publication queues, and **permutation selection**. It stops at a published
CPU payload; it hands out objects and accepts commits.

It is GPU-free and stays that way. It does not define GPU-shaped interfaces for
engines to implement, which is precisely why the consume/commit shape is used
instead of an injected realizer.

## The seam: reflection from the shader, topology from the package

This is the distinction the first engine got wrong.

**Carbon reflection belongs to `Tr2Shader`.** One file yields many shaders, one
shader is one permutation, and many effects share them — see
[shader-resource-model.md](shader-resource-model.md). The surface is
`GetConstant(name)`, `GetResource(name)`, `GetParameterAnnotations(parameterName)`,
`GetEffectDescription()` and `iterateStages()`, reachable through
`GetPortableEffectReflection` -> `Tr2Shader.fromPortable`.

**Backend binding topology belongs to the package**, because it has no Carbon
counterpart — it comes from the lowered IR, not from Carbon's D3D-era reflection.

| ask the shader | ask the package |
|---|---|
| `constants[].{name, offset, size}` | `group`, `binding`, `visibility` |
| resource `type`, `isSRGB` | `generatedSymbol`, `resourceKind` |
| annotations | `registerIndex`, `registerSpace` |
| the parameter's name | `viewDimension` |

If you find yourself wanting *richer package reflection*, you are on the wrong
side of this table. The data you want is on the shader, and it is there because
Carbon put it there.

## The two mistakes not to copy

### 1. Do not read format-package records for Carbon reflection

`engine-webgpu/src/core/packageHelpers.js` and
`src/core/spaceObjectMainBindings.js` read `metadataName`, `heapView`,
`carbon.type`, `carbon.isSRGB` and `carbon.constants[].{name, offset, size}`
directly out of the format package, to pack real material uniform bytes. Twelve
lines, two files, and a recorded defect — tracked in
[effect-container-port-decisions.md](effect-container-port-decisions.md).

It is deferred rather than fixed because nothing can use that path until the
shader work lands, so the break is theoretical. That is a reason not to rush it,
not a reason to reproduce it.

### 2. Do not reimplement permutation selection

`Tr2EffectRes` already keeps a permutation-index-keyed shader cache and resolves
options through it — Carbon's own mechanism, and ours matches. An engine that
grows its own index-keyed resolution is writing a second copy of a tested thing.

Building pipelines, bind groups and GPU objects is **not** duplication; that is
the engine's whole job. The line falls exactly where the table above falls.

## runtime-core is optional

`runtime-core` wires named services by default — `RegisterResourceBehavior`
registers "a structural request policy without importing its owner", and the
resource manager, space-object factory and audio manager register the same way.
It is a convenience wrapper, not a dependency.

Every hook it registers can be passed by hand. An engine that only works when
`runtime-core` is present has taken a dependency through the back door.

## Checklist for a new engine package

- no imports of `runtime-core`, `runtime-resource`, or `runtime-trinity`
- readers, material resolvers and batch shapes arrive injected or duck-typed
- Carbon reflection is read from a shader object handed in, never from format
  records
- permutation selection is asked for, never reimplemented
- long-lived state machines and queues stay in the resource layer; the engine
  consumes requests and commits results
- the package works with `runtime-core` absent
