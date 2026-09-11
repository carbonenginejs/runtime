// Source: trinity/Eve/Renderable/EveSceneStaticParticles.h:105
//
// The static-particle field's per-draw block.
//
// ONE VERTEX PAYLOAD. Carbon uploads it at the per-object VS register and
// binds nothing to the pixel stage.
//
// Carbon holds its payload as members and uploads them with hand-written
// FillAndSetConstants calls.
//
// Here the payload is a RawData leased in a named layout and the upload is the
// family's shared one, so this class carries the donor's identity and its payload
// shape - which is all that distinguishes it from its siblings in Carbon either.

import { Tr2PerObjectData } from "./Tr2PerObjectData.js";
import { carbon, impl } from "#schema";


/**
 * The static-particle field's per-draw block.
 */
export class EveSceneStaticParticlesPerObjectData extends Tr2PerObjectData
{
  /** The vertex payload. */
  vs = null;

  /** @returns {object[]} The payloads this object uploads. */
  GetPayloads()
  {
    return [ this.vs ];
  }

  /**
   * Leases the object and its payload.
   *
   * The layout name is fixed rather than a parameter: Carbon's class is bound to
   * its struct type by the member's declaration, so there is nothing for a caller
   * to choose.
   *
   * @param {object} accumulator An `ITriRenderBatchAccumulator`.
   * @returns {EveSceneStaticParticlesPerObjectData} The leased object.
   */
  static alloc(accumulator)
  {
    const record = new this();

    record.vs = accumulator.Alloc("EveSceneStaticParticlesPerObjectData");

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
