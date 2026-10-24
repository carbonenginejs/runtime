# Compiled effect reflection helpers

The compiled effect format itself is `CjsCarbonEffectFormat` in `../carbonEffect`.
This folder holds the reflection helpers that format and the WebGL/WebGPU
packagers share:

- `HlslReader`, `HlslBinaryUtils` and `HlslEffectReadError`: the little-endian
  byte reader for compiled effect data and its error type.
- `carbonTypedViews`: bound-view formats of the typed buffers and typed UAV
  textures Carbon binds by effect parameter name.
- `detailMapFamily`, `localLightFamily` and `textureArrayFamilies`: recognise
  Carbon's resource families from reflection alone.
