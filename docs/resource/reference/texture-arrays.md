# Texture arrays and texture packs

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource`
Audience: Users and integrators  
Summary: Explains how several images become one texture through `dynamic:/texturearray` and `dynamic:/texturepack`, and how a merged shader register binds it.

## One texture from several images

Two dynamic resource constructors assemble a single texture from separate
images. The path is the whole identity: the same images in the same order
always name the same cached texture, and changing one image names a
different one. Nothing is mutated in place.

```text
dynamic:/texturearray/res:/a.dds;res:/b.dds;res:/c.dds
dynamic:/texturepack/res:/a.dds;res:/b.dds:rg
```

- `texturearray` stacks the images as the layers of one 2D texture array,
  layer 0 first.
- `texturepack` packs up to four channels into one 2D texture. A source gives
  its red channel unless a channel suffix (`:rg`, `:a`, ...) says otherwise.

Both are opt-in. Register them on the resource manager before use:

```js
import { blue } from "@carbonenginejs/runtime/blue";
import { RegisterTextureArray, RegisterTexturePack } from "@carbonenginejs/runtime/resource";

RegisterTextureArray(blue.resMan);
RegisterTexturePack(blue.resMan);
```

Each source image loads once and is cached on its own. The assembled texture
is built by a texture-pipeline recipe (convert, resize, stack or pack, then
generate mips), so sources of different sizes and block-compressed formats
can be combined.

## Merged shader registers

A browser shader may merge a family of maps (for example `Detail1Map`,
`Detail2Map` and `Detail3Map`) into one texture at a single register, to stay
within the platform's texture-unit limit. The effect's reflection records the
members, in order, on that register's `Tr2EffectResource` (`arrayLayers`,
plus `packed` for a channel pack).

The effect keeps its ordinary named texture parameters, so everything that
sets `Detail1Map` by name keeps working. At bind time the merged register
reads the members' current paths and binds the matching
`dynamic:/texturearray/...` or `dynamic:/texturepack/...` texture:

- while the assembled texture loads, the backend's placeholder for that
  texture dimension fills the slot, and the material rebinds when it
  completes;
- if any member has no path, the slot binds nothing.
