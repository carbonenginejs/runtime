// Source: trinity/trinityal/Tr2MemoryCounterAL.h
// Source: trinity/trinityal/Tr2MemoryCounterAL.cpp
//
// An estimate of the video memory one AL resource holds, folded into running
// totals while the resource lives and taken back out when it is released.
//
// Carbon's DX11/DX12 buffers, textures and swap chains own one of these
// (`Tr2BufferALDx11.h`, `Tr2TextureALDx11.h`, `Tr2SwapChainALDx11.h`); the stub
// backend does not.
//
// Adapted: the four `CCP_STATS_DECLARE` counters (`Tr2MemoryCounterAL.cpp:6-9`)
// belong to Carbon's statistics registry, which this runtime does not have. They
// are the class's own static fields, under Carbon's counter symbol names, so a
// reader finds them where the donor declares them.
//
// Adapted: C++ move construction and move assignment transfer ownership of the
// counted bytes and leave the source at zero. JavaScript has no moves, so they
// are `create__Move` and `Assign__Move`, and the destructor's `Reset` is reached
// through `Destruct`.
//
// The file declares its methods by call rather than decorator because the
// layer is imported straight from source by its tests and raw Node cannot parse
// decorator syntax.

import { CjsSchema, meta } from "#schema";
import { isNumber } from "#utils/is";
import { Tr2MsaaDesc } from "./Tr2HalHelperStructures/Tr2MsaaDesc.js";


/** `Tr2MemoryCounterAL::MemoryType` (`Tr2MemoryCounterAL.h:10-16`). */
const MemoryType = Object.freeze({
  /** Counted nowhere: system memory is not a GPU estimate. */
  SYSTEM_MEMORY: 0,

  /** Counted in `gpuMemoryBufferEst`. */
  BUFFER: 1,

  /** Counted in `gpuMemoryTextureEst`. */
  TEXTURE: 2,

  /** Counted in `gpuMemoryOtherEst`. */
  OTHER: 3
});


/**
 * One resource's contribution to the estimated GPU memory totals.
 *
 * Carbon: Tr2MemoryCounterAL (trinity/trinityal/Tr2MemoryCounterAL.h:7)
 */
export class Tr2MemoryCounterAL
{
  /** Registered name; `constructor.name` does not survive minification. */
  static className = "Tr2MemoryCounterAL";

  /** `Tr2MemoryCounterAL::MemoryType`. */
  static MemoryType = MemoryType;

  /** gpuMemoryTotalEst: "Trinity/AL/gpuMemoryEst/total" (`Tr2MemoryCounterAL.cpp:6`). */
  static gpuMemoryTotalEst = 0;

  /** gpuMemoryBufferEst: "Trinity/AL/gpuMemoryEst/buffers" (`Tr2MemoryCounterAL.cpp:7`). */
  static gpuMemoryBufferEst = 0;

  /** gpuMemoryTextureEst: "Trinity/AL/gpuMemoryEst/textures" (`Tr2MemoryCounterAL.cpp:8`). */
  static gpuMemoryTextureEst = 0;

  /** gpuMemoryOtherEst: "Trinity/AL/gpuMemoryEst/other" (`Tr2MemoryCounterAL.cpp:9`). */
  static gpuMemoryOtherEst = 0;

  /** m_memoryType */
  _memoryType = MemoryType.SYSTEM_MEMORY;

  /** m_size */
  _size = 0;

  /**
   * Builds a counter holding nothing.
   *
   * Carbon: Tr2MemoryCounterAL::Tr2MemoryCounterAL (trinity/trinityal/Tr2MemoryCounterAL.cpp:12-16)
   */
  constructor()
  {
  }

  /**
   * Takes over another counter's bytes, leaving it at zero.
   *
   * Carbon: Tr2MemoryCounterAL::Tr2MemoryCounterAL( Tr2MemoryCounterAL&& ) (trinity/trinityal/Tr2MemoryCounterAL.cpp:18-23)
   *
   * Like the C++ move constructor this does NOT touch the totals: the bytes the
   * source already counted are simply now this counter's to release.
   *
   * @param {Tr2MemoryCounterAL} other The counter to take from.
   * @returns {Tr2MemoryCounterAL} The new counter.
   */
  static create__Move(other)
  {
    const counter = new Tr2MemoryCounterAL();

    counter._memoryType = other._memoryType;
    counter._size = other._size;
    other._size = 0;

    return counter;
  }

  /**
   * Releases what the counter holds, as the C++ destructor does.
   *
   * Carbon: Tr2MemoryCounterAL::~Tr2MemoryCounterAL (trinity/trinityal/Tr2MemoryCounterAL.cpp:25-28)
   *
   * Adapted: JavaScript has no deterministic destructor; the owner calls this
   * when it releases the resource.
   */
  Destruct()
  {
    this.Reset();
  }

  /**
   * Replaces this counter's bytes with another's, leaving it at zero.
   *
   * Carbon: Tr2MemoryCounterAL::operator=( Tr2MemoryCounterAL&& ) (trinity/trinityal/Tr2MemoryCounterAL.cpp:30-42)
   *
   * Adapted: JavaScript cannot overload `=`.
   *
   * @param {Tr2MemoryCounterAL} other The counter to take from.
   * @returns {Tr2MemoryCounterAL} This counter.
   */
  Assign__Move(other)
  {
    if (this === other) return this;

    this.Reset();

    this._memoryType = other._memoryType;
    this._size = other._size;
    other._size = 0;

    return this;
  }

  /**
   * Carbon's overloaded Set: a byte size, or a bitmap with an optional
   * multisample description.
   *
   * Carbon: Tr2MemoryCounterAL::Set (trinity/trinityal/Tr2MemoryCounterAL.cpp:44-83)
   *
   * Adapted: C++ picks the overload from the static type. Here the second
   * argument is a Number exactly when it is a size, so the route is an exact
   * check; engine code calls `Set__Size` or `Set__Bitmap`.
   *
   * @param {number} memoryType A `MemoryType` value.
   * @param {number|object} sizeOrBitmap Bytes, or a `Tr2BitmapDimensions`.
   * @param {Tr2MsaaDesc} [msaa] The multisample description, with a bitmap.
   */
  Set(memoryType, sizeOrBitmap, msaa)
  {
    if (isNumber(sizeOrBitmap)) return this.Set__Size(memoryType, sizeOrBitmap);

    return this.Set__Bitmap(memoryType, sizeOrBitmap, msaa);
  }

  /**
   * Counts a raw byte size under a memory type.
   *
   * Carbon: Tr2MemoryCounterAL::Set( MemoryType, size_t ) (trinity/trinityal/Tr2MemoryCounterAL.cpp:44-55)
   *
   * @param {number} memoryType A `MemoryType` value.
   * @param {number} size Bytes.
   */
  Set__Size(memoryType, size)
  {
    this.Reset();

    this._memoryType = memoryType;
    this._size = size;
    if (!this._size) return;

    this._UpdateCounters(size | 0);
  }

  /**
   * Counts the bytes of a bitmap, every mip of every array slice, per sample.
   *
   * Carbon: Tr2MemoryCounterAL::Set( MemoryType, const Tr2BitmapDimensions&, const Tr2MsaaDesc& ) (trinity/trinityal/Tr2MemoryCounterAL.cpp:71-83)
   *
   * @param {number} memoryType A `MemoryType` value.
   * @param {object} bitmap A `Tr2BitmapDimensions`.
   * @param {Tr2MsaaDesc} [msaa] The multisample description; one sample by default.
   */
  Set__Bitmap(memoryType, bitmap, msaa = new Tr2MsaaDesc())
  {
    this.Reset();

    this._memoryType = memoryType;
    this._size = 0;

    const mult = bitmap.GetArraySize() * Math.max(msaa.samples, 1);
    for (let i = 0; i < bitmap.GetTrueMipCount(); ++i)
    {
      this._size += bitmap.GetMipSize(i) * mult;
    }

    this._UpdateCounters(this._size | 0);
  }

  /**
   * Adds bytes to what this counter holds.
   *
   * Carbon: Tr2MemoryCounterAL::Grow (trinity/trinityal/Tr2MemoryCounterAL.cpp:57-61)
   *
   * @param {number} size Bytes to add.
   */
  Grow(size)
  {
    this._size += size;
    this._UpdateCounters(size | 0);
  }

  /**
   * Takes bytes off what this counter holds.
   *
   * Carbon: Tr2MemoryCounterAL::Shrink (trinity/trinityal/Tr2MemoryCounterAL.cpp:63-69)
   *
   * Quirk (Tr2MemoryCounterAL.cpp:65): `CCP_ASSERT( size <= m_size )` is the only
   * guard and is compiled out of a shipping build, after which the unsigned
   * subtraction wraps. JavaScript has no unsigned wrap here, so the size goes
   * negative instead; nothing is clamped.
   *
   * @param {number} size Bytes to remove.
   */
  Shrink(size)
  {
    this._size -= size;
    this._UpdateCounters(-(size | 0));
  }

  /**
   * Gives back everything this counter holds.
   *
   * Carbon: Tr2MemoryCounterAL::Reset (trinity/trinityal/Tr2MemoryCounterAL.cpp:85-93)
   */
  Reset()
  {
    if (!this._size) return;

    this._UpdateCounters(-(this._size | 0));
    this._size = 0;
  }

  /**
   * Applies a signed change to the totals for this counter's memory type.
   *
   * Carbon: Tr2MemoryCounterAL::UpdateCounters (trinity/trinityal/Tr2MemoryCounterAL.cpp:95-114)
   *
   * @param {number} inc The signed change in bytes.
   */
  _UpdateCounters(inc)
  {
    switch (this._memoryType)
    {
      case MemoryType.SYSTEM_MEMORY:
        return;

      case MemoryType.BUFFER:
        Tr2MemoryCounterAL.gpuMemoryBufferEst += inc;
        break;

      case MemoryType.TEXTURE:
        Tr2MemoryCounterAL.gpuMemoryTextureEst += inc;
        break;

      case MemoryType.OTHER:
        Tr2MemoryCounterAL.gpuMemoryOtherEst += inc;
        break;

      default:
        break;
    }

    Tr2MemoryCounterAL.gpuMemoryTotalEst += inc;
  }
}

CjsSchema.decorateMethod(Tr2MemoryCounterAL, "create__Move", meta.adapted);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Destruct", meta.adapted);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Assign__Move", meta.adapted);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Set", meta.adapted);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Set__Size", meta.implemented);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Set__Bitmap", meta.implemented);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Grow", meta.implemented);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Shrink", meta.adapted);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "Reset", meta.implemented);
CjsSchema.decorateMethod(Tr2MemoryCounterAL, "_UpdateCounters", meta.adapted);
CjsSchema.meta.carbon("Tr2MemoryCounterAL")(Tr2MemoryCounterAL);
