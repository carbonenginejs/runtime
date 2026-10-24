# PNG ImageIO formats

Ordinary ImageIO and texture-resource loads select storage from PNG channels and
sample depth. No shader-specific load request or second file read is required.

| Source after palette/transparency expansion | 8-bit storage | 16-bit storage |
| --- | --- | --- |
| Grayscale | R8_UNORM | R16_UNORM |
| Grayscale plus alpha | R8G8_UNORM | R16G16_UNORM |
| RGB | B8G8R8X8_UNORM | R16G16B16A16_UNORM |
| RGBA | B8G8R8A8_UNORM | R16G16B16A16_UNORM |

This follows the native PNG handler's channel-format mapping. Packed 1/2/4-bit
grayscale is normalized to 8-bit samples by the JS decoder. Palette entries and
transparency keys expand before storage selection. Sixteen-bit samples retain
their low bits and are stored little-endian in HostBitmap. The separate `rgba`
decode output remains RGBA8 for callers explicitly using that output.

Cutout and text metadata follow the existing ImageIO metadata path. Explicit
requested-format conversions still run after the native read.

Shader consumers must respect the resulting layout. An RG texture samples
luminance in R and alpha in G; it is not sampled RGBA luminance. Compositing
shaders use their compact-channel flags. A forward material requiring RGB
colour plus material alpha must receive the appropriately composed/expanded
material, rather than bind an RG source as though it were RGBA.

WebGPU uses its existing filterable half-float substitution for 16-bit UNORM
uploads, now including RG16. CPU storage remains exact; GPU half-float sampling
can round normalized values. Native 8-bit R/RG uploads require no substitution.
