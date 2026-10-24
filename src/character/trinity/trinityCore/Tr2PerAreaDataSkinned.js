// Source: trinity/trinity/Tr2PerObjectData.h:152-190
// Source: trinity/trinity/Tr2PerObjectData.cpp:147-214
import { blue, meta } from "#schema";
import { ShaderType } from "#consts/render-context";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2PerObjectData } from "../../../trinity/core/rawData/perObjectData/Tr2PerObjectData.js";
import { Tr2RenderUtils } from "../../../trinity/core/Tr2RenderUtils.js";
import { PER_OBJECT_VS } from "../../../trinity/core/Tr2Renderer.js";
import { Tr2PerObjectDataSkinned, TR2_MAX_BONES_PER_MESHAREA } from "./Tr2PerObjectDataSkinned.js";

/** A mesh area's copied joint palette and reference to its object's shared data. */
@blue.define("Tr2PerAreaDataSkinned")
export class Tr2PerAreaDataSkinned extends Tr2PerObjectData
{
  /** m_jointCount. */
  _jointCount = 0;

  /** m_jointTransforms: native zeroed f32 shader buffer, not a logical matrix value. */
  _jointTransforms = new Float32Array(TR2_MAX_BONES_PER_MESHAREA * 12); // alloc: retained native palette buffer

  /** m_perObjectDataPtr: the object owns world, mirror and PS data. */
  _perObjectDataPtr = null;

  /** Native release behavior clamps the per-area count (cpp:196-206). */
  @blue.method
  @meta.implemented
  SetJointCount(n)
  {
    this._jointCount = Math.min(n, TR2_MAX_BONES_PER_MESHAREA);
  }

  /** Copies one packed matrix; bounds assert becomes a JS error (cpp:208-213). */
  @blue.method
  @meta.adapted
  SetJointTransform(ix, data)
  {
    if (ix < 0 || ix >= TR2_MAX_BONES_PER_MESHAREA) throw new RangeError("Skinned joint index exceeds the per-area palette.");
    const offset = ix * 12;
    for (let i = 0; i < 12; i++) this._jointTransforms[offset + i] = data[i];
  }

  /** Borrows the shared object, matching the native reference (h:173). */
  @blue.method
  @meta.implemented
  SetPerObjectData(perObjectData)
  {
    this._perObjectDataPtr = perObjectData;
  }

  /** Returns the remapped joint count (h:178). */
  @blue.method
  @meta.implemented
  GetJointCount()
  {
    return this._jointCount;
  }

  /** Returns the retained packed matrix buffer (h:182). */
  @blue.method
  @meta.implemented
  GetMatrices()
  {
    return this._jointTransforms;
  }

  /**
   * Uploads the area's joints and the object's transforms, then delegates PS.
   * Adapted: the AL returns a mapped Uint8Array instead of void* (cpp:147-182).
   * Unused joints and the reserved register remain untouched, as in Carbon.
   */
  @blue.method
  @meta.adapted
  SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  {
    let uploaded = 0;
    const mask = constantTypeMask & Tr2PerObjectData.VertexFamilyMask;
    if (mask)
    {
      const buffer = buffers[ShaderType.VERTEX_SHADER];
      const size = Tr2PerObjectDataSkinned.vertexBufferSize;
      if (!buffer.IsValid() || buffer.GetSize() < size) buffer.Create__Size(size, renderContext);
      const mapped = buffer.Lock(renderContext);
      if (!Failed(mapped.result) && mapped.data)
      {
        this._perObjectDataPtr.UpdateVertexShaderCBMirror(mapped.data, renderContext);
        const bytes = new Uint8Array(this._jointTransforms.buffer, this._jointTransforms.byteOffset, this._jointCount * 48); // alloc: byte view of the retained palette, no backing allocation
        mapped.data.set(bytes);
        buffer.Unlock(renderContext);
        uploaded += 1;
      }
      Tr2RenderUtils.setConstants(buffer, mask, PER_OBJECT_VS, renderContext);
    }
    const remainingMask = constantTypeMask & ~Tr2PerObjectData.VertexFamilyMask;
    if (remainingMask) uploaded += this._perObjectDataPtr.SetPerObjectDataToDevice(buffers, remainingMask, renderContext);
    return uploaded;
  }

  /** Native indirect writer (cpp:184-194); Tr2IndirectDrawBufferWriter is unported. */
  @blue.method
  @meta.notImplemented
  ApplyConstantBuffers(_writer, _renderContext)
  {
    throw new Error("Tr2PerAreaDataSkinned.ApplyConstantBuffers: indirect draw is unported.");
  }
}
