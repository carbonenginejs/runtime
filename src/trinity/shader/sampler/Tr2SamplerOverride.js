// Source: trinity/trinity/Shader/Tr2Effect.h
// Source: trinity/trinity/Shader/Tr2Effect.cpp:84-107
import { meta, types } from "#schema";
import { TextureAddressMode, TextureFilter } from "#consts/render-context";

/**
 * Plain native structure overriding one named sampler's addressing, filtering
 * and LOD settings. Per-field persistence is the existing JavaScript record
 * adapter for the owner's persisted structure list, not a Blue class exposure.
 * The owner retains its separate legacy signed scalar-input coercion.
 */
@meta.define({ className: "Tr2SamplerOverride", family: "shader" })
export class Tr2SamplerOverride
{

  /** name (BlueSharedString) */
  @meta.edit.persist
  @types.string
  name = "";

  /** addressU (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @meta.edit.persist
  @types.uint32
  @types.enum("TextureAddressMode")
  addressU = 1;

  /** addressV (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @meta.edit.persist
  @types.uint32
  @types.enum("TextureAddressMode")
  addressV = 1;

  /** addressW (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @meta.edit.persist
  @types.uint32
  @types.enum("TextureAddressMode")
  addressW = 1;

  /** filter (Tr2RenderContextEnum::TextureFilter) */
  @meta.edit.persist
  @types.uint32
  @types.enum("TextureFilter")
  filter = 2;

  /** mipFilter (Tr2RenderContextEnum::TextureFilter) */
  @meta.edit.persist
  @types.uint32
  @types.enum("TextureFilter")
  mipFilter = 2;

  /** lodBias (float) */
  @meta.edit.persist
  @types.float32
  lodBias = 0;

  /** maxMipLevel (uint32_t) */
  @meta.edit.persist
  @types.uint32
  maxMipLevel = 0;

  /** maxAnisotropy (uint32_t) */
  @meta.edit.persist
  @types.uint32
  maxAnisotropy = 4;

  /**
   * Native 64-bit sizeof(Tr2SamplerOverride), including the unexposed sampler
   * member at byte 40 (Tr2Effect.h:23-37; Tr2SamplerStateAL.h:36 shared_ptr).
   * BlueStructureList.h:108-110 and BlackWriter.cpp:286-304 write this full
   * stride. The pointer storage is skipped, never hydrated as a live sampler.
   */
  static byteSize = 56;

  /** Existing JavaScript alias for the native address-mode vocabulary. */
  static TextureAddressMode = TextureAddressMode;

  /** Existing JavaScript alias for the native filter vocabulary. */
  static TextureFilter = TextureFilter;

}
