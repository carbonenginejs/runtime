# Browser platform capabilities

Status: Evolving
Scope: `@carbonenginejs/runtime-core/platform`
Audience: Runtime and engine integrators
Summary: Documents privacy-respecting browser screen, WebGPU adapter, and WebGL2 snapshots, and the device requirement a library resolves for an engine, without device ownership.

## Import

```js
import {
    CjsWebGLProbe,
    PlatformStaticCap,
    ResolveDeviceRequirements,
    ResolveRequiredFeatures,
    ResolveRequiredLimits,
    Tr2DisplayMode,
    Tr2PlatformInfo,
    Tr2VideoAdapter,
    Tr2VideoAdapters,
    Tr2VideoDriver,
    WEBGL2_PARAMETERS,
    WEBGPU_DEFAULT_LIMITS
} from "@carbonenginejs/runtime-core/platform";
```

The same values are currently re-exported from the package root.

## Platform detection

`Tr2PlatformInfo.Detect(options)` uses an injected adapter or requests one
from an injected or global `navigator.gpu`, probes WebGL2 beside it, maps the
observed features and limits to `PlatformStaticCap`, records probe errors, and
never requests a `GPUDevice`.

```js
const platform = await Tr2PlatformInfo.Detect();
platform.GetStaticCap(PlatformStaticCap.COMPUTE);
platform.GetCapabilities();
platform.RegisterCapabilities(library);
```

Capabilities that cannot be established from browser-visible facts remain
false. Temporal anti-aliasing is an application/engine choice and is enabled
only through the explicit `taa` detection option.

### Which backend the report describes

`backend` is `"webgpu"`, `"webgl"`, or `"none"`, and the `PlatformStaticCap`
answers describe that one backend rather than blending two. WebGPU wins when
both are present; a library may still compose the WebGL engine, and both
capability families are reported either way.

The capability record carries `webgpu` and `webgl2` as **separate** keys.
`webgpu === false` states only that WebGPU is absent, which is not evidence
that WebGL2 is present, so a consumer selecting an engine reads the positive
key rather than negating the other.

### WebGL2 probing

`CjsWebGLProbe.Detect(options)` accepts an injected `context`, an injected
`canvas`, or creates and releases its own — preferring `OffscreenCanvas`, then
`document.createElement`. It reads the parameters named in `WEBGL2_PARAMETERS`
and the supported-extension list, and never touches the unmasked renderer
strings.

```js
const probe = CjsWebGLProbe.Detect();
probe.available;                                // WebGL2 is present
probe.GetLimit("MAX_TEXTURE_IMAGE_UNITS", 16);  // the per-stage texture budget
probe.HasExtension("EXT_color_buffer_float");
probe.GetStaticCaps();                          // Carbon's caps, as WebGL2 answers them
```

A probe releases only a context it created, through `WEBGL_lose_context`, so
probing does not consume one of the browser's live WebGL contexts. An
unavailable or failing context is reported as an unavailable capability with a
`probeError`; it never throws.

Pass `webgl: false` to `Detect` to skip acquiring a context, or pass an
existing `CjsWebGLProbe` to reuse one.

## Device requirements

A WebGPU device is created with the default limits unless a `requiredLimits`
is supplied, and this package owns that decision so an engine never chooses its
own configuration. The engine receives the result through its injectable
`deviceDescriptor` option and passes it to `requestDevice` unchanged.

```js
const { descriptor, unsatisfiedLimits, unavailableFeatures } =
    platform.ResolveDeviceRequirements({
        label: "space",
        limits: { maxSampledTexturesPerShaderStage: 20 },
        features: [ "texture-compression-bc" ]
    });
```

The demand describes what the **content** needs, not what the backend is, so it
is supplied by the caller rather than fixed here. Three rules apply:

- a demand at or below the WebGPU default in `WEBGPU_DEFAULT_LIMITS` is
  omitted, keeping the descriptor to what is actually being asked for;
- a demand above what the adapter advertises is omitted and reported in
  `unsatisfiedLimits`, because `requestDevice` rejects an unsupportable limit
  and would fail the whole library rather than degrade. The same applies to
  features and `unavailableFeatures`;
- an unrecognised limit name throws. `WEBGPU_DEFAULT_LIMITS` deliberately
  carries only maximum-style limits: the two `min*OffsetAlignment` limits
  improve downward, so a keep-the-larger rule would invert them and they are
  rejected rather than mishandled.

`GetDeviceDescriptor(demand)` returns the descriptor alone.
`ResolveRequiredLimits` and `ResolveRequiredFeatures` are exported for a caller
resolving against an adapter it holds directly.

## Adapter and driver snapshots

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
