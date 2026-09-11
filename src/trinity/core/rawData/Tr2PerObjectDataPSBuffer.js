// Source: trinity/Tr2PerObjectData.h:42 (Tr2PerObjectDataPSBuffer)
// Source: trinity/Tr2PerObjectData.cpp:29-37 (the base upload and apply bodies)
//
// Shared pixel-shader storage for the per-object data classes that carry one.
//
// NOTHING BINDS AT THIS LEVEL. Carbon's base SetPerObjectDataToDevice is an
// empty body and this class does not override it, so it is storage and nothing
// else - exactly as its donor comment says, "a common functionality of
// Tr2PerObjectDataStandard, Tr2PerAreaSHLightingData and
// Tr2PerObjectDataSkinned". Allocating one directly uploads nothing, which is
// Carbon's behaviour and not an omission here.
//
// WHY THERE IS NO CopyToPSFloatBuffer. Carbon's Copy methods bridge a STACK
// struct into a member float array:
//
//     EvePerObjectPSData perObjectPSBuffer;                 // stack, defaults
//     perObjectPSBuffer.WorldMat = Transpose( m_worldTransform );
//     data->CopyToPSFloatBuffer( perObjectPSBuffer );       // memcpy into member
//
// JavaScript has no such gap: a RawData already IS the uploadable buffer. So the
// class leases its RawData in the named shape and the producer writes onto it
// directly. A method carrying Carbon's name while accepting field-wise writes
// instead of a whole struct would read as ported when it is not.
//
// Carbon's three static_asserts land as one create-time check. `sizeof(T) <=
// sizeof(buffer)` is AssertFitsPerObjectBudget; `sizeof(T) % 16 == 0` is already
// guaranteed by every CjsPerObjectLayouts stride; the not-a-pointer assert has
// no JS counterpart.

import { Tr2PerObjectData } from "./Tr2PerObjectData.js";


/** `m_pixelShaderFloatConstantBuffer[80 * 4]` - Carbon's PS register budget. */
export const PER_OBJECT_PS_FLOAT_CAPACITY = 80 * 4;

/** `m_vertexShaderFloatConstantBuffer[40 * 4]` - Carbon's VS register budget. */
export const PER_OBJECT_VS_FLOAT_CAPACITY = 40 * 4;


/**
 * Carbon's `static_assert( sizeof( T ) <= sizeof( buffer ) )`, at lease time.
 *
 * A layout wider than its register budget is a porting mistake rather than a
 * runtime condition, so this throws. `FillAndSetConstants` would otherwise clamp
 * the copy to the buffer and drop the tail - which is Carbon's own behaviour for
 * an oversized payload, and exactly the quiet wrongness the assert exists to
 * stop at build time.
 *
 * @param {object} payload A leased `RawData`.
 * @param {number} floatCapacity The register budget, in floats.
 * @param {string} struct The layout name, for the message.
 * @param {string} half Either "VS" or "PS", for the message.
 */
export function AssertFitsPerObjectBudget(payload, floatCapacity, struct, half)
{
  const floats = payload.GetData().length;

  if (floats > floatCapacity)
  {
    throw new Error(
      `Tr2PerObjectData: ${half} layout "${struct}" is ${floats} floats, `
      + `over Carbon's ${floatCapacity}-float per-object ${half} register budget.`
    );
  }
}


/**
 * Per-object data carrying a pixel-shader payload.
 *
 * Storage only: it declares no upload, because Carbon's does not.
 */
export class Tr2PerObjectDataPSBuffer extends Tr2PerObjectData
{
  /**
   * The pixel payload, in the shape this object was leased for.
   *
   * Carbon's equivalent is a fixed 1,280-byte member zeroed in the constructor,
   * with `m_pixelShaderFloatBufferSize` recording how much of it a copy filled.
   * Ours is exactly its layout's stride, so the size IS the buffer and there is
   * no tail to disagree about.
   */
  ps = null;

  /**
   * Leases a per-object data object and its pixel payload.
   *
   * Carbon leases the OBJECT from the accumulator too -
   * `accumulator->Allocate<Tr2PerObjectDataStandard>()` - because its buffers are
   * inline members and the whole thing lives in the frame arena. Constructed
   * directly here instead, because `ITriRenderBatchAccumulator.Allocate` records
   * that it only calls the constructor - in JS the GC owns the object's lifetime,
   * and it is the BUFFERS that need the arena. If that door ever starts pooling,
   * route this through it.
   *
   * @param {object} accumulator An `ITriRenderBatchAccumulator`.
   * @param {string} psStruct A `CjsPerObjectLayouts` struct name.
   * @returns {Tr2PerObjectDataPSBuffer} The leased object.
   */
  static alloc(accumulator, psStruct)
  {
    const data = new this();

    data.ps = accumulator.Alloc(psStruct);

    AssertFitsPerObjectBudget(data.ps, PER_OBJECT_PS_FLOAT_CAPACITY, psStruct, "PS");

    return data;
  }
}
