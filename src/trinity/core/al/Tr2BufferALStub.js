// Source: trinity/trinityal/stub/Tr2BufferALStub.cpp
// Source: trinity/trinityal/stub/Tr2BufferALStub.h
// Source: trinity/trinityal/include/Tr2BufferAL.h
// Source: trinity/trinityal/src/Tr2BufferAL.cpp (the description constructors)
//
// The GPU-free buffer: vertex, index, structured and indirect-argument data.
//
// Unlike the texture, the buffer's storage is the whole point of the type -
// `IsValid` is literally "the allocation has a size". A caller maps it, writes
// vertices into it, maps it again and reads them back, all without a device,
// which is what lets a headless frame carry real geometry.
//
// TWO DECISIONS TO KNOW ABOUT.
//
// - A ranged read returns the bytes of THAT RANGE. Carbon's stub validates the
//   range and then hands back the start of the buffer regardless
//   (`Tr2BufferALStub.cpp:96-98`), which is harmless there because its storage
//   is never meaningfully filled. Ours is, so returning the base would hand a
//   caller the wrong bytes; every real backend offsets, and so does this.
// - `UpdateBuffer` VALIDATES AND MOVES NOTHING, exactly as Carbon's stub does.
//   The stub is not a memory model: the map path is what carries data. A caller
//   that needs the write to land must map for writing.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";
import {
  GetBytesPerPixel,
  HasFlag,
  PixelFormat,
  Tr2CpuUsage,
  Tr2GpuUsage
} from "../../../global/consts/renderContext/index.js";


/** Carbon's "no descriptor heap index". */
const NO_HEAP_INDEX = 0xffffffff;


/**
 * How a buffer is laid out and what may touch it.
 *
 * Carbon's two non-default constructors differ only in where the stride comes
 * from: `FromFormat` derives it from the pixel format, `FromStride` is given
 * it outright for a structured buffer.
 */
export class Tr2BufferDescriptionAL
{
  /** A `PixelFormat` value; unknown for a structured buffer. */
  format = PixelFormat.PIXEL_FORMAT_UNKNOWN;

  /** Bytes per element. */
  stride = 0;

  /** Elements. */
  count = 0;

  /** A `Tr2GpuUsage` bit set. */
  gpuUsage = Tr2GpuUsage.NONE;

  /** A `Tr2CpuUsage` bit set. */
  cpuUsage = Tr2CpuUsage.NONE;

  /**
   * A typed buffer, whose stride follows from its format.
   *
   * @param {number} format A `PixelFormat` value.
   * @param {number} count Elements.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @returns {Tr2BufferDescriptionAL} The description.
   */
  static FromFormat(format, count, gpuUsage, cpuUsage)
  {
    const description = new Tr2BufferDescriptionAL();

    description.format = format;
    description.stride = GetBytesPerPixel(format);
    description.count = count;
    description.gpuUsage = gpuUsage;
    description.cpuUsage = cpuUsage;

    return description;
  }

  /**
   * A structured buffer, whose stride is given.
   *
   * @param {number} stride Bytes per element.
   * @param {number} count Elements.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @returns {Tr2BufferDescriptionAL} The description.
   */
  static FromStride(stride, count, gpuUsage, cpuUsage)
  {
    const description = new Tr2BufferDescriptionAL();

    description.stride = stride;
    description.count = count;
    description.gpuUsage = gpuUsage;
    description.cpuUsage = cpuUsage;

    return description;
  }

  /**
   * The buffer's size in bytes.
   *
   * @returns {number} Stride times count.
   */
  GetSizeInBytes()
  {
    return this.stride * this.count;
  }
}


/**
 * A buffer that holds its bytes on the CPU.
 */
export class Tr2BufferALStub extends Tr2BaseDeviceResourceAL
{
  /** m_desc */
  #desc = new Tr2BufferDescriptionAL();

  /** m_buffer */
  #buffer = new Uint8Array(0);

  /**
   * Creates the buffer.
   *
   * @param {Tr2BufferDescriptionAL} desc The buffer description.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(desc, initialData, renderContext)
  {
    this.#Reset();

    if (desc.count === 0) return ALResult.E_INVALIDARG;

    // Nothing can ever put bytes in it: the same refusal the texture makes,
    // for the same reason.
    if (!HasFlag(desc.cpuUsage, Tr2CpuUsage.WRITE) && !initialData) return ALResult.E_INVALIDARG;

    if (!renderContext.IsValid()) return ALResult.E_INVALIDCALL;

    this.#desc = desc;
    this.#buffer = new Uint8Array(desc.GetSizeInBytes());

    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy`: empties without unregistering. */
  #Reset()
  {
    this.#desc.count = 0;
    this.#buffer = new Uint8Array(0);
  }

  /** Releases the buffer and leaves the device-resource registry. */
  Destroy()
  {
    this.#Reset();
    super.Destroy();
  }

  /**
   * Whether the buffer holds anything.
   *
   * @returns {boolean} True when it has a size.
   */
  IsValid()
  {
    return this.#buffer.length > 0;
  }

  /**
   * Which memory class this buffer occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * The buffer description.
   *
   * @returns {Tr2BufferDescriptionAL} The description.
   */
  GetDesc()
  {
    return this.#desc;
  }

  /**
   * Maps the whole buffer, or a range of it, for reading.
   *
   * @param {object} renderContext The context to map against.
   * @param {number} [offset] Byte offset of the range.
   * @param {number} [size] Bytes in the range; the whole buffer when omitted.
   * @returns {{result: number, data: Uint8Array|null}} The mapping.
   */
  MapForReading(renderContext, offset = 0, size = 0)
  {
    if (!renderContext.IsValid() || !this.IsValid()) return { result: ALResult.E_INVALIDCALL, data: null };

    const ranged = size !== 0 || offset !== 0;

    if (ranged && (size === 0 || offset + size > this.#desc.GetSizeInBytes()))
    {
      return { result: ALResult.E_INVALIDARG, data: null };
    }

    if (!HasFlag(this.#desc.cpuUsage, Tr2CpuUsage.READ)) return { result: ALResult.E_INVALIDCALL, data: null };

    // See the head comment: a range returns its own bytes, not the base.
    const data = ranged ? this.#buffer.subarray(offset, offset + size) : this.#buffer;

    return { result: ALResult.S_OK, data };
  }

  /** Carbon's stub releases nothing on unmap; the storage is the buffer. */
  UnmapForReading()
  {
  }

  /**
   * Maps the whole buffer for writing.
   *
   * @param {object} renderContext The context to map against.
   * @returns {{result: number, data: Uint8Array|null}} The mapping.
   */
  MapForWriting(renderContext)
  {
    if (!renderContext.IsValid() || !this.IsValid()) return { result: ALResult.E_INVALIDCALL, data: null };

    if (!HasFlag(this.#desc.cpuUsage, Tr2CpuUsage.WRITE)) return { result: ALResult.E_INVALIDCALL, data: null };

    return { result: ALResult.S_OK, data: this.#buffer };
  }

  /** @see UnmapForReading */
  UnmapForWriting()
  {
  }

  /**
   * Validates a buffer update. IT MOVES NO BYTES - see the head comment.
   *
   * A buffer mapped often is written through a map, so Carbon refuses
   * `WRITE_OFTEN` here outright.
   *
   * @param {number} offset Byte offset of the range.
   * @param {number} size Bytes in the range.
   * @param {ArrayBufferView} data The bytes.
   * @param {object} renderContext The context to update against.
   * @returns {number} An `ALResult` value.
   */
  UpdateBuffer(offset, size, data, renderContext)
  {
    if (!renderContext.IsValid() || !this.IsValid()) return ALResult.E_INVALIDCALL;

    if (offset + size > this.#desc.GetSizeInBytes()) return ALResult.E_INVALIDARG;

    if (!HasFlag(this.#desc.cpuUsage, Tr2CpuUsage.WRITE) || HasFlag(this.#desc.cpuUsage, Tr2CpuUsage.WRITE_OFTEN))
    {
      return ALResult.E_INVALIDCALL;
    }

    return ALResult.S_OK;
  }

  /**
   * Where the shader-resource view sits in the descriptor heap.
   *
   * @returns {number} Carbon's "no index".
   */
  GetSrvIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * Where the unordered-access view sits in the descriptor heap.
   *
   * @returns {number} Carbon's "no index".
   */
  GetUavIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * Names the buffer for a debugger.
   *
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }
}
