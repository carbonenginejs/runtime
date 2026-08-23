// Source: trinity/trinity/Shader/Tr2Effect.h
// Hand-maintained from Tr2Effect.cpp's Blue structure definition and defaults.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { Tr2RenderContext } from "../../core/context/Tr2RenderContext.js";

/** Overrides one named sampler's address, filtering, LOD-bias, mip, and anisotropy settings. */
@type.define({ className: "Tr2SamplerOverride", family: "shader" })
export class Tr2SamplerOverride extends CjsModel
{

  /** name (BlueSharedString) */
  @io.rebuild("bindings")
  @io.persist
  @type.string
  name = "";

  /** addressU (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @io.rebuild("bindings")
  @io.persist
  @type.int32
  @type.enum("TextureAddressMode")
  addressU = 1;

  /** addressV (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @io.rebuild("bindings")
  @io.persist
  @type.int32
  @type.enum("TextureAddressMode")
  addressV = 1;

  /** addressW (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @io.rebuild("bindings")
  @io.persist
  @type.int32
  @type.enum("TextureAddressMode")
  addressW = 1;

  /** filter (Tr2RenderContextEnum::TextureFilter) */
  @io.rebuild("bindings")
  @io.persist
  @type.int32
  @type.enum("TextureFilter")
  filter = 2;

  /** mipFilter (Tr2RenderContextEnum::TextureFilter) */
  @io.rebuild("bindings")
  @io.persist
  @type.int32
  @type.enum("TextureFilter")
  mipFilter = 2;

  /** lodBias (float) */
  @io.rebuild("bindings")
  @io.persist
  @type.float32
  lodBias = 0;

  /** maxMipLevel (uint32_t) */
  @io.rebuild("bindings")
  @io.persist
  @type.uint32
  maxMipLevel = 0;

  /** maxAnisotropy (uint32_t) */
  @io.rebuild("bindings")
  @io.persist
  @type.uint32
  maxAnisotropy = 4;

  static TextureAddressMode = Tr2RenderContext.TextureAddressMode;

  static TextureFilter = Tr2RenderContext.TextureFilter;

}
