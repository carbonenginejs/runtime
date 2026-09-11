// Source: trinity/Tr2PerObjectData.h:71 (Tr2PerObjectDataStandard)
// Source: trinity/Tr2PerObjectData.cpp:42-73
//
// Per-object data for an ordinary renderable: one vertex payload and one pixel
// payload, uploaded to the per-object registers.
//
// Carbon's producers are EveLineSet, EveCurveLineSet and EveEllipseSet (each
// Eve/UI/*.cpp, GetPerObjectData), all of which fill only WorldMat and leave
// every other field at its layout default.
//
// WHY THIS CLASS EXISTS RATHER THAN A { vs, ps } RECORD. Carbon's upload is a
// virtual on the data, and its subclasses differ in a way no shared function can
// express: Standard binds its pixel buffer without consulting the technique mask
// while Skinned gates the identical payload behind it. In C++ that difference is
// carried entirely by overload resolution on an argument type -
// FillAndSetConstants takes `unsigned` at Tr2RenderUtils.h:35 and `ShaderType`
// at :46, the latter shifting `1 << t` - which JavaScript cannot express. With
// the class restored, each subclass simply states its own behaviour.

import { Tr2PerObjectData } from "./Tr2PerObjectData.js";
import {
  AssertFitsPerObjectBudget,
  PER_OBJECT_VS_FLOAT_CAPACITY,
  Tr2PerObjectDataPSBuffer
} from "./Tr2PerObjectDataPSBuffer.js";
import { carbon, impl } from "#schema";


/**
 * Per-object data with both a vertex and a pixel payload.
 */
export class Tr2PerObjectDataStandard extends Tr2PerObjectDataPSBuffer
{
  /** The vertex payload, in the shape this object was leased for. */
  vs = null;

  /**
   * Leases a per-object data object and both of its payloads.
   *
   * @param {object} accumulator An `ITriRenderBatchAccumulator`.
   * @param {string} vsStruct A `CjsPerObjectLayouts` struct name for the vertex payload.
   * @param {string} psStruct A `CjsPerObjectLayouts` struct name for the pixel payload.
   * @returns {Tr2PerObjectDataStandard} The leased object.
   */
  static alloc(accumulator, vsStruct, psStruct)
  {
    const data = super.alloc(accumulator, psStruct);

    data.vs = accumulator.Alloc(vsStruct);

    AssertFitsPerObjectBudget(data.vs, PER_OBJECT_VS_FLOAT_CAPACITY, vsStruct, "VS");

    return data;
  }

  /**
   * Uploads both payloads and binds them at the per-object registers.
   *
   * THE PIXEL HALF IS GATED HERE AND IS NOT IN CARBON, which is the one
   * behavioural divergence in this class. Carbon passes the PIXEL_SHADER enum,
   * selecting the overload that shifts `1 << PIXEL_SHADER` and never intersects
   * it with the technique's mask, so Standard binds its pixel buffer even for a
   * technique with no pixel stage (`Tr2PerObjectData.cpp:61-66`; Skinned gates
   * the same payload at :77).
   *
   * We gate it, for a reason Carbon does not have available: our layouts DECLARE
   * which stages they serve, so the gate is per layout rather than per hardcoded
   * half, and it is strictly more precise. `FillAndSetConstants` is built around
   * that - its own head comment records that a zero mask binding nothing "is how
   * a payload declared for stages a technique does not use gets skipped, per
   * batch, without the caller testing anything". Binding a pixel buffer for a
   * pipeline with no pixel stage is wasted upload work, and the declaration also
   * expresses a payload serving both stages in ONE buffer, which Carbon can only
   * do with two.
   *
   * The upload itself is the shared static, so this class adds the virtual and
   * the identity without a second copy of the mechanism.
   *
   * @param {object[]} buffers A `Tr2ConstantBufferAL` per `ShaderType`.
   * @param {number} constantTypeMask A bit per `ShaderType`.
   * @param {object} renderContext The context to upload and bind against.
   * @returns {number} How many payloads were uploaded.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon binds the pixel payload without consulting the technique mask, distinguished from the gated form only by C++ overload resolution on an argument type. Our layouts declare the stages they serve, so the gate is per declaration and more precise than Carbon's hardcoded halves.")
  SetPerObjectDataToDevice(buffers, constantTypeMask, renderContext)
  {
    return Tr2PerObjectData.setPerObjectDataToDevice(this, buffers, constantTypeMask, renderContext);
  }

  /**
   * The indirect-draw sibling.
   *
   * Carbon writes both payloads through a `Tr2IndirectDrawBufferWriter`
   * (`Tr2PerObjectData.cpp:69-73`). That class has no JS counterpart and nothing
   * on this path draws indirectly, and Carbon's base asserts rather than
   * defaulting (`:34-37`), so an accidental call must not look successful.
   */
  @carbon.method
  @impl.notImplemented
  @impl.reason("Tr2IndirectDrawBufferWriter is unported and nothing on this path draws indirectly.")
  ApplyConstantBuffers()
  {
    throw new Error("Tr2PerObjectDataStandard.ApplyConstantBuffers: indirect draw is unported.");
  }
}
