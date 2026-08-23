# @carbonenginejs/engine-webgpu documentation

Status: Experimental
Scope: `@carbonenginejs/engine-webgpu`
Audience: Users and renderer integrators
Summary: Maps the supported Carbon WebGPU package, WebGPU device, and standalone harness contracts.

## Purpose

`@carbonenginejs/engine-webgpu` consumes already-selected Carbon WebGPU package data
and realizes explicit WebGPU pipeline, resource, binding, and draw requests.

## Use this package when

Use it when a caller already has decoded Carbon WebGPU data, explicit pipeline state,
packed geometry, texture data, sampler state, and uniform values.

## Where it fits

The package owns the WebGPU device boundary and immutable Carbon WebGPU-facing
descriptors. Format readers may be injected by callers. Resource acquisition,
effect selection, renderer scheduling, scene extraction, and Trinity graph
integration belong elsewhere and are not current dependencies.

## Start here

Start with the [architecture](architecture.md), then use the
[API reference](reference/api.md). Maintainers qualifying generated shader
packages should use the [WebGPU harness](guides/webgpu-harness.md).

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Public API reference](reference/api.md)
- [Class catalog](reference/classes/README.md)
- [WebGPU harness](guides/webgpu-harness.md)
