# Browser platform capabilities

Status: Evolving
Scope: `@carbonenginejs/runtime-core/platform`
Audience: Runtime and engine integrators
Summary: Documents privacy-respecting browser screen and WebGPU adapter snapshots without device ownership.

## Import

```js
import {
    PlatformStaticCap,
    Tr2DisplayMode,
    Tr2PlatformInfo,
    Tr2VideoAdapter,
    Tr2VideoAdapters,
    Tr2VideoDriver
} from "@carbonenginejs/runtime-core/platform";
```

The same values are currently re-exported from the package root.

## Platform detection

`Tr2PlatformInfo.Detect(options)` uses an injected adapter or requests one
from an injected or global `navigator.gpu`. It maps observed features and
limits to `PlatformStaticCap`, records probe errors, and never requests a
`GPUDevice`.

```js
const platform = await Tr2PlatformInfo.Detect();
platform.GetStaticCap(PlatformStaticCap.COMPUTE);
platform.GetCapabilities();
platform.RegisterCapabilities(library);
```

Capabilities that cannot be established from browser-visible facts remain
false. Temporal anti-aliasing is an application/engine choice and is enabled
only through the explicit `taa` detection option.

## Capability-driven shader variant substitution

Some shader variants cannot fit a backend's texture-unit limit. Where that
happens the engine substitutes a cheaper variant **once, when the engine is
identified**, rather than degrading the shader. It is not a per-draw or
per-effect decision.

| Backend | Condition | Substitution |
| --- | --- | --- |
| WebGL 2 | always | `heatdetail` → `heat` |
| WebGPU | any | none |

WebGL 2 guarantees 16 texture image units per stage, and the heat+detail
space-object shader needs 17 there after every available saving — including
merging its detail maps into one array texture and packing the local light
buffers. Substituting the plain heat variant costs the detail layer on heat-shaded
objects and nothing else; notably no lighting quality, which the alternatives
would have cost.

WebGPU needs no substitution, including at its default limits. Carbon's local
lights are structured buffers, which WebGPU has natively and which cost no
texture units; the same resources have to become data textures on WebGL 2. The
measured shader fits every default per-stage limit, though with no spare texture
units, so a device offering a higher `maxSampledTexturesPerShaderStage` is worth
requesting as margin.

This package owns the *capability* (the reported limit); the substitution
*policy* is engine-level. Both variants remain valid packaged outputs, and a
device able to run `heatdetail` runs it.

`Tr2VideoAdapter.FromGPUAdapter(adapter)` snapshots the browser-visible
adapter info, sorted feature names, numeric limits, fallback status, and a
`Tr2VideoDriver`. Native identifiers, versions, dates, and switchable-GPU
flags remain `null` when the browser withholds them.

`GetValues()` methods return plain copied data. `GetDriverInfo()` returns an
independent driver snapshot.

## Display snapshot

`Tr2DisplayMode.FromScreen(screen, windowObject)` records current dimensions,
available dimensions, color depth, pixel ratio, orientation, and extended
screen state where exposed. Browsers do not provide a native display-mode
list, scanline ordering, or a reliable refresh-rate enumeration, so the class
does not invent those facts.

## Adapter/display facade

`Tr2VideoAdapters.Detect(options)` and `Refresh(options)` expose the single
adapter selected by the browser and one current-screen snapshot.

- `GetAdapterCount()` and `GetAdapterInfo(index)` inspect the adapter.
- `GetCurrentDisplayMode(index)` inspects the current screen.
- `GetDisplayModeCount()` and `GetDisplayMode()` expose at most that one
  compatible snapshot.
- `SupportsBackBufferFormat()` and `SupportsRenderTargetFormat()` use injected
  support policies or the browser's preferred canvas format.
- `GetMaxTextureSize(index)` reports `maxTextureDimension2D` when observed.

The facade does not enumerate hidden hardware adapters or create presentation
objects.
