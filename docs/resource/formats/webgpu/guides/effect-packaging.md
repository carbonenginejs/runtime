# Build a Carbon WebGPU package from compiled effect bytes

Status: Evolving
Scope: `@carbonenginejs/runtime/resource/formats/webgpu`
Audience: Shader-tool authors and engine integrators
Summary: Shows how to translate version-15 compiled effects into Carbon-record Carbon WebGPU bytes.

## Purpose

Use `buildEffect` when a caller already has version-15 compiled-effect bytes
and needs a WebGPU-targeted effect container. The operation parses the complete
input, resolves a permutation, lowers supported DXBC, allocates pass-global
bindings, emits WGSL, writes a Carbon v15 container, and validates the result.

The method is byte-oriented and does not open files or resource paths.

## Build selected passes

```js
import { CjsWebgpuFormat } from "@carbonenginejs/runtime/resource/formats/webgpu";

const result = CjsWebgpuFormat.buildEffect(effectBytes, {
    source: "res:/graphics/effect.dx11/example.sm_hi",
    mode: "selected",
    permutation: [
        { name: "QUALITY", value: "HIGH" }
    ],
    selection: {
        techniqueName: "Main",
        passIndex: 0,
        stageNames: [ "vertex", "pixel" ]
    }
});

const packageBytes = result.bytes;
const emittedShaders = result.wgsl;
```

`source` is a caller-owned diagnostic label. An optional `sourceIdentity`
records build provenance in the returned result; it does not change the wire
identity, which belongs to the resource path used to load the emitted bytes.
When `sourceIdentity.sha256` is supplied, the build checks it against the exact
input bytes.

## What the bytes contain

The [wire layout](../formats/carbon-webgpu.md#wire-layout) preserves permutation
topology and representable reflection, replaces source programs with WGSL or
empty slots, and may carry per-pass backend data. It stores neither source DXBC nor
the original source hash, and has no separate compatibility-view chunks.

## Translation modes

### Selected

The default [selected mode](../formats/carbon-webgpu.md#selected-mode) translates
requested complete passes without discarding permutations.

### All

[All mode](../formats/carbon-webgpu.md#all-mode) first requires the resolved
selection to translate, then attempts every distinct body. Passes own binding
and transform plans; stages are not independent translation units. See the
[API options](../reference/api.md#effect-package-options) for compatibility flags.

## Build result

Use `result.bytes` as the artifact. The
[API result table](../reference/api.md#build-result-and-qualification) owns the
additional evidence fields and completeness gates: a structurally valid package
does not prove executable or rendered output.

## Read the result

```js
const summary = CjsWebgpuFormat.inspect(packageBytes, {
    source: "res:/graphics/effect.webgpu/example.sm_hi"
});

const data = CjsWebgpuFormat.read(packageBytes, {
    source: "res:/graphics/effect.webgpu/example.sm_hi"
});
```

The [read result](../reference/api.md#read-result) is a derived JSON document,
not another stored representation.

The `raw` emit was retired (closure recorded 2026-08-13). Reads return the
derived document; the only emit name is `"json"`, and unsupported values throw
`TypeError`. The container reader remains internal. See
[read options](../reference/api.md#profile-options).

## Binding scope

A D3D resource tuple is stage-local unless authoritative metadata proves that
the vertex and fragment declarations name one compatible resource. Build one
binding plan from the complete stage set.

```js
const plan = CjsWebgpuFormat.buildWgslBindingPlan(
    [ vertexIr, fragmentIr ],
    { sharedIdentities: [ "uniform-buffer:0:0" ] }
);
```

Unshared identities receive separate `@vertex` or `@fragment`
`scopeIdentity` values and numeric slots. Shared identities retain one bare
scope with combined visibility.

## Resource transforms

Follow the [version-3 resource-transform contract](../formats/carbon-webgpu.md#version-3-resource-transforms)
to assemble and bind compatible array layers; missing layers fail closed.
A version-3 document is not executable evidence by itself.

## Errors

See [API errors](../reference/api.md#errors) for rejected inputs and selections,
and [all mode](../formats/carbon-webgpu.md#all-mode) for the distinction between
an initial failure and a later unsupported body.

## Related documentation

- [Carbon WebGPU effect container](../formats/carbon-webgpu.md)
- [Public API reference](../reference/api.md)
- [WGSL compatibility](../reference/wgsl-compatibility.md)
- [Carbon compiled-effect container](../../carbon-effect-container.md)
