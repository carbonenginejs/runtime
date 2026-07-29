# Shader facade notes

This folder owns Trinity's mutable effect/material facade. It is GPU-free, but
it is not the canonical owner of compiled-effect resources or immutable shader
reflection.

## Ownership

`@carbonenginejs/runtime-trinity` owns:

- `Tr2Effect` and `Tr2Material`;
- effect parameters, authored `Tr2ShaderOption` values, sampler overrides, and
  the variable store;
- dirty/rebuild state and "used by current effect/technique" bookkeeping;
- `Tr2ShaderBuffer` as device-free authored byte data.

`@carbonenginejs/runtime-resource` owns:

- `Tr2EffectRes`, effect-package selection, and per-index shader caching;
- canonical `Tr2Shader` plus effect, technique, pass, stage, constant,
  resource, annotation, library, define, and sampler reflection records;
- portable-reflection hydration.

`@carbonenginejs/runtime-resource/formats/hlsl` owns compiled-effect binary
parsing and the validated plain portable-reflection schema. CEWG and CEWGPU packages expose
that portable reflection. WebGL/WebGPU engines own program/module creation,
layouts, bindings, uploads, pipelines, draws, and device recovery.

The `runtime-trinity/shader` barrel compatibility-reexports the
resource-owned classes so existing consumers retain exact constructor and
schema identity. Trinity depends on runtime-resource; runtime-resource never
imports Trinity.

```text
.sm_* bytes
    |
    v
format-hlsl portable plain reflection
    |
    v
CEWG / CEWGPU package
    |
    v
runtime-resource Tr2EffectRes -> canonical Tr2Shader graph
    |
    v
runtime-trinity Tr2Effect / Tr2Material / options / parameters
    |
    v
engine-webgl or engine-webgpu GPU realization
```

## Construction boundary

Canonical model instances use inherited `Class.from(object)` for JS/JSON
construction. Portable compiled-effect documents enter through
`Tr2Shader.fromPortable(document)`, which delegates each child record to that
child class's `fromPortable` method. Binary `read(reader, context)` methods are
intentionally deferred until the binary parser and canonical model classes are
co-located; adding them now would create a reverse dependency or duplicate the
parser.

## Mutable Trinity behavior

`Tr2Effect` maps reflected constants and resources into mutable effect
parameters, applies authored options and sampler overrides, and tracks rebuild
state. It does not load package bytes or create a GPU program.

`Tr2Material` keeps graph-side pass/library containers and dirty flags.
Resource-set construction and binding remain engine work.

`CjsVariableStore` is an explicit, graph-only shared variable store. It stores
named values but never binds constants, textures, UAVs, or buffers.

`Tr2ShaderBuffer` stores copied bytes. Upload and binding remain engine work.

## Constraints

- No shader code in this package may create or retain backend handles.
- Do not duplicate the resource-owned shader/reflection classes locally.
- Keep compatibility reexports identity-preserving; do not wrap or subclass
  them.
- Do not call backend binding APIs such as `SetSrv`, `SetUav`,
  `SetShaderBuffer`, `SetConstants`, `ApplyShaderProgram`, or
  `SetResourceSet`.
