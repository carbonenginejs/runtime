import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/index.js";
// Source: trinity/trinity/Tr2RuntimeGpuBuffer.h
// Source: trinity/trinity/Tr2RuntimeGpuBuffer.cpp
// Hand-maintained from Carbon source; the AL buffer is backend-private state.
import { meta } from "#schema";

/**
 * An ITr2GpuBuffer over one runtime AL buffer: what `Tr2Effect::SetParameter`
 * wraps a `Tr2BufferAL` in so a buffer parameter can hold it.
 */
@meta.define({ className: "Tr2RuntimeGpuBuffer", family: "trinityCore" })
export class Tr2RuntimeGpuBuffer
{
  /** m_buffer: the AL buffer, or null for Carbon's default-constructed one. */
  _buffer = null;

  /**
   * The held buffer; the index is ignored, as Carbon ignores it (cpp:6-9).
   *
   * @param {number} [_index] Unused.
   * @returns {object|null} The AL buffer.
   */
  @meta.blue.method
  @meta.implemented
  GetGpuBuffer(_index = 0)
  {
    return this._buffer;
  }

  /**
   * Copies the held value (cpp:11-14); explicit reset replaces its C++ destructor.
   *
   * @param {object|null} buffer The AL buffer.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetGpuBuffer(buffer)
  {
    const next = buffer ? new Tr2BufferAL({ copy: buffer }) : null;
    if (this._buffer) this._buffer.Destroy();
    this._buffer = next;
  }
}
