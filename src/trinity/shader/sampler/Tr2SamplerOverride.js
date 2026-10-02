// Source: trinity/trinity/Shader/Tr2Effect.h
// Source: trinity/trinity/Shader/Tr2Effect.cpp:84-107
import { meta, types } from "#schema";
import { TextureAddressMode, TextureFilter } from "#consts/render-context";

/**
 * Plain native structure overriding one named sampler's addressing, filtering
 * and LOD settings. Per-field persistence is the existing JavaScript record
 * adapter for the owner's persisted structure list, not a Blue class exposure.
 * The owner retains its separate legacy signed scalar-input coercion.
 * Native 64-bit size 56; offsets and storage types: trinity/trinity/
 * Shader/Tr2Effect.h:23-37; Shader/Tr2Effect.cpp:84-95 (including sampler storage at 40..55).
 */
@meta.define({ className: "Tr2SamplerOverride", family: "shader" })
@meta.struct.define({ size: 56 })
export class Tr2SamplerOverride
{

  /** name (BlueSharedString) */
  @meta.edit.persist
  @meta.struct.SHAREDSTRING_1(0)
  name = "";

  /** addressU (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @meta.edit.persist
  @meta.struct.UINT32_1(8)
  @types.enum("TextureAddressMode")
  addressU = 1;

  /** addressV (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @meta.edit.persist
  @meta.struct.UINT32_1(12)
  @types.enum("TextureAddressMode")
  addressV = 1;

  /** addressW (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
  @meta.edit.persist
  @meta.struct.UINT32_1(16)
  @types.enum("TextureAddressMode")
  addressW = 1;

  /** filter (Tr2RenderContextEnum::TextureFilter) */
  @meta.edit.persist
  @meta.struct.UINT32_1(20)
  @types.enum("TextureFilter")
  filter = 2;

  /** mipFilter (Tr2RenderContextEnum::TextureFilter) */
  @meta.edit.persist
  @meta.struct.UINT32_1(24)
  @types.enum("TextureFilter")
  mipFilter = 2;

  /** lodBias (float) */
  @meta.edit.persist
  @meta.struct.FLOAT32_1(28)
  lodBias = 0;

  /** maxMipLevel (uint32_t) */
  @meta.edit.persist
  @meta.struct.UINT32_1(32)
  maxMipLevel = 0;

  /** maxAnisotropy (uint32_t) */
  @meta.edit.persist
  @meta.struct.UINT32_1(36)
  maxAnisotropy = 4;

  /** Existing JavaScript alias for the native address-mode vocabulary. */
  static TextureAddressMode = TextureAddressMode;

  /** Existing JavaScript alias for the native filter vocabulary. */
  static TextureFilter = TextureFilter;

}
