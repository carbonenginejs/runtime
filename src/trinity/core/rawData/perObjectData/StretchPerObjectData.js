// Source: trinity/Eve/Renderable/Stretch/EveStretch2.cpp:20
//
// A stretch's endpoint and effect block, bound to both registers.
//
// ONE PAYLOAD, BOUND TO BOTH per-object registers. Carbon calls
// FillAndSetConstants TWICE over the same bytes to do that; the layout declares
// `stages: [ "vs", "ps" ]`, so the payload is uploaded once and bound to both.
// See README.md, The divergence.
//
// CARBON HOLDS NOTHING: `void* m_data; size_t m_size` point at a 64-byte window
// starting at EveStretch2::m_source, so the OWNER's member block is the constant
// buffer (EveStretch2.h:105-109, a float between the two Vector3s filling each w).
// JavaScript cannot point into an object's fields, so the layout names those four
// vectors and the producer writes them. See README.md.
//
// Here the payload is a RawData leased in a named layout and the upload is the
// family's shared one, so this class carries the donor's identity and its payload
// shape - which is all that distinguishes it from its siblings in Carbon either.

import { Tr2PerObjectData } from "./Tr2PerObjectData.js";
import { carbon, impl } from "#schema";


/**
 * A stretch's endpoint and effect block, bound to both registers.
 */
export class StretchPerObjectData extends Tr2PerObjectData
{
  /** The payload, bound to both per-object registers. */
  data = null;

  /** @returns {object[]} The payloads this object uploads. */
  GetPayloads()
  {
    return [ this.data ];
  }

  /**
   * Leases the object and its payload.
   *
   * The layout name is fixed rather than a parameter: Carbon's class is bound to
   * its struct type by the member's declaration, so there is nothing for a caller
   * to choose.
   *
   * @param {object} accumulator An `ITriRenderBatchAccumulator`.
   * @returns {StretchPerObjectData} The leased object.
   */
  static alloc(accumulator)
  {
    const record = new this();

    record.data = accumulator.Alloc("EveStretch2PerObjectData");

    return record;
  }

  /**
   * Uploads this object's payload and binds it.
   *
   * Carbon binds without consulting the technique's shader mask; we gate on it.
   * The reason is the family's, stated once in README.md and docketed as CE-19.
   *
   * @param {object[]} buffers A `Tr2ConstantBufferAL` per `ShaderType`.
   * @param {number} constantTypeMask A bit per `ShaderType`.
   * @param {object} renderContext The context to upload and bind against.
   * @returns {number} How many payloads were uploaded.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon binds this payload without consulting the technique mask, a form distinguished from the gated one only by C++ overload resolution on an argument type. Our layouts declare the stages they serve, so the gate is per declaration; see the family README and CE-19.")
  SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  {
    return Tr2PerObjectData.setPerObjectDataToDevice(this, buffers, constantTypeMask, renderContext);
  }
}
