# Architecture

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/formats/hlsl` implementation boundaries
Audience: Integrators and maintainers
Summary: Explains the package boundary, parsing flow, output modes, and platform adapters.

## Ownership boundary

The package owns the compiled Carbon/Trinity effect-container boundary:
headers, string tables, permutation selection, effect descriptions,
techniques, passes, render states, stage metadata, signatures, and the
packaging of opaque shader bytecode.

It does not decode shader instructions, compile source code, or own runtime
resource binding. Those responsibilities remain with bytecode-format,
translation, and runtime packages.

## Read flow

```text
caller bytes
    -> input and option normalization
    -> effect header, strings, and permutation axes
    -> selected compiled body
    -> techniques, passes, and stage metadata
    -> json | metadata | raw output
```

`src/CjsHlslFormat.js` is the supported reader boundary. Binary utilities and
format-shaped compatibility models live below `src/core` and `src/carbon`.
Their same-named `Tr2*` classes are internal parser DTOs, not canonical runtime
model identity, and are not independent package entry points.

## Output modes

- `json` is the default interoperable data graph and may include opaque
  bytecode and constant-value bytes.
- `metadata` is a compact, bytecode-free graph for inspection and pipeline
  planning.
- `raw` exposes internal effect-model instances for advanced tooling and is
  not a stable schema.
- `@carbonenginejs/runtime-resource/formats/hlsl/portable` copies one exact body into a versioned,
  runtime-neutral source-reflection contract. Authored defaults and programs stay
  separate from mutable renderer realization.

`runtime-resource` owns canonical `Tr2EffectRes`/`Tr2Shader` hydration,
permutation selection, and caching. `runtime-trinity` owns the mutable
effect/material facade, parameters, authored options, and sampler overrides.
Engines own GPU realization.

The graph shapes are documented in
[reference/json-graph.md](reference/json-graph.md).

## Platform boundary

`read`, `inspect`, and `toJSON` operate on caller-provided bytes and work
without filesystem access. `readFile` and the CLI are Node-specific adapters.
The package has no runtime dependencies.

## Error boundary

Structural failures include the source label and read context where available.
The reader rejects unsupported versions and unsafe reads instead of silently
guessing a layout. A selected compiled body can record its own decode failure
in raw or JSON-oriented inspection data where the format model supports that
state.
