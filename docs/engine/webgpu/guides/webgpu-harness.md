# WebGPU harness

Status: Experimental
Scope: `@carbonenginejs/runtime/engine/webgpu` browser qualification
Audience: Maintainers and shader integrators
Summary: Runs the built WebGPU runtime in Chromium and qualifies shader, resource, Trinity-batch, and pixel contracts.

The harness launches headless Chromium through Playwright, evaluates the built
runtime, compiles WGSL, renders to offscreen textures, reads pixels back, and
checks deterministic results. It is a repository-maintainer check: the npm
artifact ships this guide, but not the launcher or fixtures.

## Run it

```powershell
npm.cmd run test:webgpu
```

This command rebuilds `npm/dist`, bundles the browser runtime boundary, and runs
the portable GPU gate. It reports a skip when the browser has no WebGPU adapter.
To require a supported adapter:

```powershell
npm.cmd run test:webgpu:required
```

The required command fails rather than skipping. Ordinary `npm.cmd test` remains
GPU-free apart from explicitly invoked browser scripts.

The browser boundary is generated at
`.cache/engine/webgpu/harness-runtime.js`. Rollup starts from the compiled npm
artifact, bundles package imports and `gl-matrix`, and emits one ESM file with no
raw source routes. This ensures the browser exercises the same translated
classes and nominal identities that consumers receive.

## Base gate

The base gate prepares a device through `CjsWebgpuDevice`, compiles a small
shader, uploads geometry and resources, renders a full-screen triangle to an
offscreen `rgba8unorm` texture, copies the target through a row-padded buffer,
and verifies the returned pixels.

Resource publication uses a real `CjsResource` with a current lifecycle
controller. Prepared WebGPU bundles are attached through the canonical adapter
slot; the fixture does not reproduce a resource-shaped method bag.

The package-family gates use the internal Trinity dispatcher and pass encoder.
Fixture records cross one test-only adapter into canonical `Tr2RenderBatch`,
`ITriRenderBatchAccumulator`, `TriRenderBatchMap`, and
`CjsTrinityBatchResolver` identities. Production engine code validates those
owned contracts once and calls them directly. The caller continues to own
batch-type meaning, pass selection, attachments, and fixture values.

## Direct WGSL inputs

Compile a candidate module while retaining the base render/readback gate:

```powershell
npm.cmd run test:webgpu:required -- --compile-wgsl .\artifacts\candidate.wgsl
```

Render a generated copyblit vertex/fragment pair:

```powershell
npm.cmd run test:webgpu:required -- --draw-wgsl `
  .\artifacts\vertex.wgsl .\artifacts\fragment.wgsl
```

The launcher serves only the selected shader text and validated fixture data.
Compilation and WebGPU validation diagnostics remain inside the browser error
scope.

## Carbon WebGPU packages

Build source effects and package matrices with tools-core. Source acquisition,
compiler orchestration, catalogs, schemas, and artifact generation do not
belong in this runtime or its browser harness.

To draw one selected complete package:

```powershell
npm.cmd run test:webgpu:required -- --draw-carbonwebgpu `
  .\artifacts\copyblit.carbonwebgpu
```

To prepare without drawing:

```powershell
npm.cmd run test:webgpu:required -- --prepare-carbonwebgpu `
  .\artifacts\candidate.carbonwebgpu

npm.cmd run test:webgpu:required -- --prepare-matrix `
  .\artifacts\matrix.json
```

`--prepare-bodyset` accepts the corresponding body-set preparation input. These
modes validate package layout and native pipeline preparation without adding
resource acquisition or build policy to the engine.

## Synthetic EVE-family comparisons

Family flags accept independently translated DX11-derived and DX12-derived
packages and compare their selected pipeline contracts and pixels. Supported
families include:

- static and skinned QuadV5;
- static/skinned glass, heat, heat-detail, detail, sails, and oil variants;
- decal, cylindric, hole, counter, glow, and glow-cylindric variants.

The exact flag names are the `--draw-*` options in
`scripts/engine/webgpu/run-webgpu-harness.js`. `--capture-quadv5` optionally
writes the QuadV5 comparison image when a QuadV5 draw flag is active.

These are synthetic conformance gates. They use explicit fixture geometry,
textures, samplers, material values, and pass recipes; they do not load a live
SOF graph, production EVE assets, or authoritative application defaults. Their
purpose is to detect translation, binding, upload, and backend drift—not to
define production frequency or scheduling policy.

## Contract boundaries

- `Tr2Shader` owns Carbon constant/resource reflection.
- A backend package owns lowered bind-group and pipeline topology.
- Trinity owns batch, accumulator, map, and step-executor identities.
- `CjsResource` owns CPU payload and adapter-publication lifecycle.
- `CjsWebgpuDevice` owns native WebGPU objects and device generations.
- The harness owns synthetic values, expected pixels, and capture presentation.
- tools-core owns source acquisition and generated artifacts.

Matrix values in semantic fixtures use logical runtime math storage and are
encoded once into Carbon cbuffer register-row bytes. Already encoded
`CjsConstantPayload`/`RawData` bytes take the raw upload path and are not passed
through the semantic serializer again.

The launcher prefers an installed Chrome channel and falls back to Playwright's
bundled Chromium. Set `CJS_WEBGPU_BROWSER_CHANNEL` to a Playwright channel name
when a runner requires an explicit browser choice.
