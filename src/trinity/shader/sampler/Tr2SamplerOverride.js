// Source: trinity/trinity/Shader/Tr2Effect.h
// Hand-maintained from Tr2Effect.cpp's Blue structure definition and defaults.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { TextureAddressMode, TextureFilter } from "#consts/render-context";

/** Overrides one named sampler's address, filtering, LOD-bias, mip, and anisotropy settings. */
@type.define({ className: "Tr2SamplerOverride", family: "shader" })
export class Tr2SamplerOverride extends CjsModel
{

  /** name (BlueSharedString) */

  @edit.persist
  @type.string
  name = "";

  /** addressU (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */

  @edit.persist
  @type.int32
  @type.enum("TextureAddressMode")
  addressU = 1;

  /** addressV (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */

  @edit.persist
  @type.int32
  @type.enum("TextureAddressMode")
  addressV = 1;

  /** addressW (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */

  @edit.persist
  @type.int32
  @type.enum("TextureAddressMode")
  addressW = 1;

  /** filter (Tr2RenderContextEnum::TextureFilter) */

  @edit.persist
  @type.int32
  @type.enum("TextureFilter")
  filter = 2;

  /** mipFilter (Tr2RenderContextEnum::TextureFilter) */

  @edit.persist
  @type.int32
  @type.enum("TextureFilter")
  mipFilter = 2;

  /** lodBias (float) */

  @edit.persist
  @type.float32
  lodBias = 0;

  /** maxMipLevel (uint32_t) */

  @edit.persist
  @type.uint32
  maxMipLevel = 0;

  /** maxAnisotropy (uint32_t) */

  @edit.persist
  @type.uint32
  maxAnisotropy = 4;

  static TextureAddressMode = TextureAddressMode;

  static TextureFilter = TextureFilter;

}
