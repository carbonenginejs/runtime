// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Organizes one shader stage's constants, parameters, textures, UAVs, and CPU-side constant mirror. */
@type.define({ className: "Tr2MaterialStageInput", family: "shader" })
export class Tr2MaterialStageInput extends CjsModel
{

  /** m_constantBufferDirty (bool) */
  @type.boolean
  constantBufferDirty = false;

  /** m_sharedBufferKey (Tr2SharedConstantBuffers::Key) */
  @type.rawStruct("Tr2SharedConstantBuffers::Key")
  sharedBufferKey = null;

  /** m_shaderParameters (Tr2EffectParamVector) */
  @type.list("Tr2EffectParam")
  shaderParameters = [];

  /** m_shaderParametersWithNotification (Tr2EffectParamVector) */
  @type.list("Tr2EffectParam")
  shaderParametersWithNotification = [];

  /** m_textures (Tr2EffectParamVector) */
  @type.list("Tr2EffectParam")
  textures = [];

  /** m_uavs (Tr2EffectParamVector) */
  @type.list("Tr2EffectParam")
  uavs = [];

  /** m_constantBuffer (Tr2ConstantBufferAL) */
  @type.rawStruct("Tr2ConstantBufferAL")
  constantBuffer = null;

  /** m_constantMirror (CcpMallocBuffer) */
  @type.rawStruct("CcpMallocBuffer")
  constantMirror = null;

  /**
   * Allocates the CPU-side constant mirror rounded up to a 16-byte multiple and marks it dirty; a zero size clears the mirror instead. No GPU buffer is created.
   * @param size requested mirror size in bytes
   */
  AllocateConstants(size = 0)
  {
    const byteSize = Math.max(0, Number(size) || 0);
    const alignedSize = byteSize % 16 ? byteSize + 16 - byteSize % 16 : byteSize;
    this.constantMirror = alignedSize ? new Uint8Array(alignedSize) : null;
    this.constantBufferDirty = alignedSize > 0;
  }

  /**
   * Replaces the constant mirror with a copy of already-built buffer contents and clears the dirty flag; a zero size clears the mirror instead.
   * @param size byte count to copy, defaulting to the contents' own byte length
   */
  GetSharedConstantBuffer(contents, size = contents?.byteLength ?? contents?.length ?? 0)
  {
    const byteSize = Math.max(0, Number(size) || 0);
    this.constantMirror = byteSize ? Tr2MaterialStageInput.copyBytes(contents, byteSize) : null;
    this.constantBufferDirty = false;
  }

  /**
   * Copies up to `size` bytes out of an ArrayBuffer, typed-array view or
   * array-like into a new zero-padded Uint8Array the caller owns.
   */
  static copyBytes(contents, size)
  {
    const out = new Uint8Array(size);
    if (contents instanceof ArrayBuffer)
    {
      out.set(new Uint8Array(contents, 0, Math.min(size, contents.byteLength)));
    }
    else if (ArrayBuffer.isView(contents))
    {
      out.set(new Uint8Array(contents.buffer, contents.byteOffset, Math.min(size, contents.byteLength)));
    }
    else if (contents && typeof contents.length === "number")
    {
      out.set(Array.from(contents).slice(0, size));
    }
    return out;
  }

}
