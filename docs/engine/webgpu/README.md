# @carbonenginejs/runtime/engine/webgpu documentation

Status: Experimental
Scope: `@carbonenginejs/runtime/engine/webgpu`
Audience: Users and renderer integrators
Summary: Maps the supported Carbon WebGPU package, WebGPU device, and standalone harness contracts.

## Purpose

`@carbonenginejs/runtime/engine/webgpu` consumes already-selected Carbon WebGPU package data
and realizes explicit WebGPU pipeline, resource, binding, and draw requests.

## Use this package when

Use it when a caller already has decoded Carbon WebGPU data, explicit pipeline state,
packed geometry, texture data, sampler state, and uniform values.

## Where it fits

The package owns the WebGPU device boundary and immutable Carbon WebGPU-facing
descriptors. It imports canonical resource and Trinity identities at the seams
it consumes, validates them once, and calls their required methods directly.
Format readers may be injected by callers. Resource acquisition, effect
selection, renderer scheduling, and scene extraction remain outside the engine.

## Start here

Start with the [architecture](architecture.md), then use the
[API reference](reference/api.md). Maintainers qualifying generated shader
packages should use the [WebGPU harness](guides/webgpu-harness.md).

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Public API reference](reference/api.md)
- [Class catalog](reference/classes/README.md)
- [WebGPU harness](guides/webgpu-harness.md)
