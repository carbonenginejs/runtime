// Source: trinity/trinity/Tr2PerObjectData.h:100-150
// Source: trinity/trinity/Tr2PerObjectData.cpp:75-145
import { blue, meta } from "#schema";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";
import { ShaderType } from "#consts/render-context";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2PerObjectData } from "../../../trinity/core/rawData/perObjectData/Tr2PerObjectData.js";
import { Tr2PerObjectDataPSBuffer } from "../../../trinity/core/rawData/perObjectData/Tr2PerObjectDataPSBuffer.js";
import { Tr2RenderUtils } from "../../../trinity/core/Tr2RenderUtils.js";
import { PER_OBJECT_VS } from "../../../trinity/core/Tr2Renderer.js";

/** Carbon's per-area joint limit (Tr2PerObjectData.h:98). */
export const TR2_MAX_BONES_PER_MESHAREA = 69;

/** Shared world/mirror and pixel data; the area supplies the remapped palette. */
@blue.define("Tr2PerObjectDataSkinned")
export class Tr2PerObjectDataSkinned extends Tr2PerObjectDataPSBuffer
{
  /** Native VS allocation: 207 joint registers, world, one unwritten register, mirror. */
  static vertexBufferSize = (TR2_MAX_BONES_PER_MESHAREA * 3 + 5 + 4) * 16;

  /** m_jointCount: number of matrices in the borrowed animation palette. */
  _jointCount = 0;

  /** m_data: borrowed packed 3x4 animation matrices. */
  _data = null;

  /** m_worldMat: native identity, copied raw at upload. */
  _worldMat = mat4.create(); // alloc: retained per-object transform

  /** m_mirrorMatrix: native identity, copied raw at upload. */
  _mirrorMatrix = mat4.create(); // alloc: retained per-object mirror transform

  /** m_worldPos: native stored value; this donor does not upload it. */
  _worldPos = vec4.create(); // alloc: retained per-object position

  /**
   * Borrows the animation buffer, as Carbon's float pointer does (cpp:136).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  SetSkinningMatrices(n, data)
  {
    this._jointCount = n;
    this._data = data;
  }

  /**
   * Returns the borrowed palette (h:119).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  GetSkinningMatrices()
  {
    return this._data;
  }

  /**
   * @adapted a typed view replaces the pointer into twelve packed floats (cpp:142).
   */
  @blue.method
  @meta.adapted
  GetSkinningMatrix(ix)
  {
    return this._data.subarray(ix * 12, (ix + 1) * 12);
  }

  /**
   * Copies the world matrix without changing its byte orientation (h:124).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  SetWorldMatrix(worldMat)
  {
    mat4.copy(this._worldMat, worldMat);
  }

  /**
   * Copies the mirror matrix (h:128).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  SetMirrorMatrix(mirrorMat)
  {
    mat4.copy(this._mirrorMatrix, mirrorMat);
  }

  /**
   * Returns the retained mirror matrix (h:132).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  GetMirrorMatrix()
  {
    return this._mirrorMatrix;
  }

  /**
   * Stores the native position with w=0 (h:136).
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  SetWorldPosition(worldPos)
  {
    vec4.set(this._worldPos, worldPos[0], worldPos[1], worldPos[2], 0);
  }

  /**
   * Copies only world and mirror; leaves the palette and reserved register untouched.
   *
   * @adapted the AL's mapped Uint8Array replaces void* (cpp:128-132).
   *   These two memcpy sites do not transpose, unlike most per-object producers.
   */
  @blue.method
  @meta.adapted
  UpdateVertexShaderCBMirror(destination, _renderContext)
  {
    const floats = new Float32Array(destination.buffer, destination.byteOffset, destination.byteLength / 4); // alloc: view of the AL's mapped shader buffer
    floats.set(this._worldMat, TR2_MAX_BONES_PER_MESHAREA * 12);
    floats.set(this._mirrorMatrix, TR2_MAX_BONES_PER_MESHAREA * 12 + 20);
  }

  /** The inherited RawData PS lease replaces Carbon's inline PS storage. */
  GetPayloads()
  {
    return this.ps ? [ this.ps ] : [];
  }

  /**
   * Native stage gating and partial VS write (cpp:75-111).
   *
   * @adapted the inherited RawData lease supplies PS bytes and the AL returns
   *   its mapped byte view instead of filling an output pointer.
   */
  @blue.method
  @meta.adapted
  SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  {
    let uploaded = Tr2PerObjectData.setPerObjectDataToDevice(
      this, buffers, constantTypeMask & Tr2PerObjectData.StageBits.ps, renderContext
    );
    const mask = constantTypeMask & Tr2PerObjectData.VertexFamilyMask;
    if (!mask) return uploaded;

    const buffer = buffers[ShaderType.VERTEX_SHADER];
    const size = Tr2PerObjectDataSkinned.vertexBufferSize;
    if (!buffer.IsValid() || buffer.GetSize() < size) buffer.Create__Size(size, renderContext);
    const mapped = buffer.Lock(renderContext);
    if (!Failed(mapped.result) && mapped.data)
    {
      this.UpdateVertexShaderCBMirror(mapped.data, renderContext);
      buffer.Unlock(renderContext);
      uploaded += 1;
    }
    Tr2RenderUtils.setConstants(buffer, mask, PER_OBJECT_VS, renderContext);
    return uploaded;
  }

  /**
   * Native indirect writer (cpp:113); Tr2IndirectDrawBufferWriter is not ported.
   *
   * @notImplemented
   */
  @blue.method
  @meta.notImplemented
  ApplyConstantBuffers(_writer, _renderContext)
  {
    throw new Error("Tr2PerObjectDataSkinned.ApplyConstantBuffers: indirect draw is unported.");
  }

  /**
   * Native PS-only indirect writer (cpp:125); its writer is not ported.
   *
   * @notImplemented
   */
  @blue.method
  @meta.notImplemented
  ApplyPsConstantBuffers(_writer, _renderContext)
  {
    throw new Error("Tr2PerObjectDataSkinned.ApplyPsConstantBuffers: indirect draw is unported.");
  }
}
