// Source: trinity/trinity/Tr2RuntimeGpuBuffer.h
// Source: trinity/trinity/Tr2RuntimeGpuBuffer.cpp
// Hand-maintained from Carbon source; the AL buffer is backend-private state.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";

/**
 * An ITr2GpuBuffer over one runtime AL buffer: what `Tr2Effect::SetParameter`
 * wraps a `Tr2BufferAL` in so a buffer parameter can hold it.
 */
@type.define({ className: "Tr2RuntimeGpuBuffer", family: "trinityCore" })
export class Tr2RuntimeGpuBuffer extends CjsModel
{
  /** m_buffer: the AL buffer, or null for Carbon's default-constructed one. */
  _buffer = null;

  /**
   * The held buffer; the index is ignored, as Carbon ignores it (cpp:6-9).
   *
   * @param {number} [_index] Unused.
   * @returns {object|null} The AL buffer.
   */
  @carbon.method
  @impl.implemented
  GetGpuBuffer(_index = 0)
  {
    return this._buffer;
  }

  /**
   * Replaces the held buffer (cpp:11-14).
   *
   * @param {object|null} buffer The AL buffer.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetGpuBuffer(buffer)
  {
    this._buffer = buffer ?? null;
  }
}
