# Texture CPU pipeline and LOD membership

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource`
Audience: Users and integrators  
Summary: Defines the `Tr2TexturePipeline` CPU-only step contract and `Tr2TextureLodManager` membership ownership.

## Tr2TexturePipeline

`Tr2TexturePipeline` is the Carbon texture-specific CPU bitmap pipeline, not a
general resource prepare stage. `GetResourceDependencies()` returns the sorted
unique paths required by load and channel-pack steps. `Execute()` resolves
those inputs from an explicit `inputs` map/object, an async `load(path)`
callback, or an injected `CjsResMan`, then returns a canonical plain
`rgba8unorm` payload:

```js
import {
  Tr2TexturePipeline,
  Tr2TexturePipelineStepLoad,
  Tr2TexturePipelineStepLimitSize
} from "@carbonenginejs/runtime/resource";

const load = new Tr2TexturePipelineStepLoad();
load.path = "res:/texture/source.png";
const limit = new Tr2TexturePipelineStepLimitSize();
limit.maxWidth = 512;

const pipeline = new Tr2TexturePipeline();
pipeline.steps = [ load, limit ];
const rgba = await pipeline.Execute(0, 0, { resMan });
```

The maintained runtime path currently accepts canonical `rgba8unorm` inputs.
Load copies the source bitmap, limit-size repeatedly performs a 2x2 CPU
downsample, pack builds logical RGBA channels from independent inputs, and
Carbon's present compress step remains validation-only because the native
method is itself a no-op. Unsupported step types fail explicitly.

For the decoded-DDS fallback contract used by 2D texture inputs, see the
[DDS notes in the format map](../formats/README.md#dds-decoded-fallback).

## Tr2TextureLodManager

`Tr2TextureLodManager` owns only ordered resource membership through
`RegisterTexture()`, `UnregisterTexture()`, and `GetManagedTextures()`.
Engine packages continue to own GPU allocations, upload accounting, device
budgets, capability limits, and device-loss recovery.

## Related documentation

- [Texture arrays and update generations](texture-arrays.md)
- [Format subpaths](../formats/README.md)
