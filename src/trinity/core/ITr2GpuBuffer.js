// Source: trinity/trinity/Include/ITr2GpuBuffer.h:13-25
import { CjsSchema, meta } from "#schema";

/** Native GPU-buffer contract: a Blue object that wraps one or more Tr2BufferAL. */
export class ITr2GpuBuffer
{
  /**
   * Returns the AL buffer; an implementation holding several (TriGeometryRes)
   * picks one by index.
   * @param {number} _index Buffer index.
   * @returns {object|null} The Tr2BufferAL, or null.
   */
  @meta.abstract
  GetGpuBuffer(_index)
  {
    throw new Error("ITr2GpuBuffer.GetGpuBuffer must be implemented by a GPU buffer.");
  }
}

CjsSchema.define(ITr2GpuBuffer, { className: "ITr2GpuBuffer", carbon: "ITr2GpuBuffer", family: "trinityCore", fields: {} });
