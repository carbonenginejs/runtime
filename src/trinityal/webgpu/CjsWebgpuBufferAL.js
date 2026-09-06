// Source: trinity/trinityal/include/Tr2BufferAL.h
//   trinity/trinityal/dx11/Tr2BufferALDx11.cpp
//   trinity/trinityal/metal/Tr2BufferALMetal.mm
//
// A device-backed `Tr2BufferAL` for WebGPU. The first one: until now the only
// buffer implementation was `Tr2BufferALStub`, a `Uint8Array` that reaches no
// device, so a Trinity class that fills a buffer every frame - `Tr2Blitter`'s
// screen quad, `Tr2RingBuffer`'s upload arena - could be written and would
// silently draw nothing.
//
// WHICH BACKEND THIS IMITATES, AND WHY IT MATTERS.
//
// Carbon has two families of MapForWriting. DX11 with WRITE_OFTEN and Metal
// with NON_SYNCRONIZED_WRITE hand back a pointer into GPU-visible memory and
// let the driver (or an engine-side pool) RENAME the underlying allocation on
// unmap, so a second map in the same frame gets fresh storage and previously
// recorded draws keep the bytes they were given. DX11 plain WRITE, DX12
// STATIC and Metal plain WRITE instead hand back a CPU scratch and upload the
// whole buffer on unmap.
//
// This is the second family, because it is the one WebGPU can express.
// `queue.writeBuffer` is already ordered on the queue, so the upload lands
// before any subsequently submitted draw reads it - which gives the guarantee
// the renaming backends buy with renaming, without needing to rename.
//
// The shadow is RETAINED, not reallocated per map. Carbon's `UpdateBuffer`
// maps, memcpys at an offset, and unmaps, expecting the bytes outside that
// range to survive (dx11:419-429, metal:293-302). A freshly zeroed scratch
// would silently blank them.
//
// NOT IMPLEMENTED: MapForReading. Reading a buffer back needs MAP_READ, a
// separate staging buffer and an await, and nothing asks for it yet. It
// refuses by name rather than returning empty bytes.
import { ALResult } from "#trinity/core";
import { Tr2CpuUsage, Tr2GpuUsage, HasFlag } from "#consts/render-context";


/** Carbon's usage flags mapped onto `GPUBufferUsage`. */
function gpuBufferUsage(gpuUsage, usage)
{
  let mask = 0;

  if (HasFlag(gpuUsage, Tr2GpuUsage.VERTEX_BUFFER)) mask |= usage.VERTEX;
  if (HasFlag(gpuUsage, Tr2GpuUsage.INDEX_BUFFER)) mask |= usage.INDEX;
  if (HasFlag(gpuUsage, Tr2GpuUsage.SHADER_RESOURCE)) mask |= usage.STORAGE;
  if (HasFlag(gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS)) mask |= usage.STORAGE;
  if (HasFlag(gpuUsage, Tr2GpuUsage.DRAW_INDIRECT_ARGS)) mask |= usage.INDIRECT;
  if (HasFlag(gpuUsage, Tr2GpuUsage.COPY_DESTINATION)) mask |= usage.COPY_DST;

  return mask;
}


/**
 * A `Tr2BufferAL` backed by a real `GPUBuffer`.
 *
 * It deliberately does NOT extend `Tr2BaseDeviceResourceAL`: that base lives in
 * Trinity and registers into a Trinity-side resource list, and the engine does
 * not import Trinity classes for identity. It implements the same surface.
 */
export class CjsWebgpuBufferAL
{
  /** m_desc */
  #desc = null;

  /** The device that owns the buffer, for writes and destruction. */
  #webgpu = null;

  /** The opaque `CreateDeviceBuffer` handle. */
  #handle = null;

  /** The retained CPU shadow; see the head comment on why it is retained. */
  #shadow = null;

  /** Whether a map is open, so a double map is caught rather than silently nested. */
  #mapped = false;

  /**
   * Creates the buffer against a device.
   *
   * @param {Tr2BufferDescriptionAL} desc The description.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The WebGPU render context AL.
   * @returns {number} An `ALResult` value.
   */
  Create(desc, initialData, renderContext)
  {
    this.Destroy();

    if (!desc || desc.count === 0) return ALResult.E_INVALIDARG;

    // Carbon's immutability rule (dx11:48-52, dx12:45, metal:47-52): a buffer
    // the CPU can never write must arrive with its contents, or nothing can
    // ever put bytes in it.
    const writable = HasFlag(desc.cpuUsage, Tr2CpuUsage.WRITE)
      || HasFlag(desc.gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS);

    if (!writable && !initialData) return ALResult.E_INVALIDARG;

    // DX12 refuses this pair outright (Tr2BufferALDx12.cpp:51-54) and we have
    // no read path at all, so refusing is both faithful and honest.
    if (HasFlag(desc.cpuUsage, Tr2CpuUsage.READ)) return ALResult.E_INVALIDARG;

    if (!renderContext || !renderContext.IsValid()) return ALResult.E_INVALIDCALL;

    const webgpu = renderContext.GetWebgpu();
    if (!webgpu) return ALResult.E_INVALIDCALL;

    const size = desc.GetSizeInBytes();
    if (size === 0) return ALResult.E_INVALIDARG;

    const mask = gpuBufferUsage(desc.gpuUsage, webgpu.GetBufferUsage());
    if (mask === 0) return ALResult.E_INVALIDARG;

    this.#handle = webgpu.CreateDeviceBuffer({ label: desc.label ?? "Tr2BufferAL", size, usage: mask });
    this.#webgpu = webgpu;
    this.#desc = desc;
    this.#shadow = new Uint8Array(this.#handle.size);

    if (initialData)
    {
      const bytes = new Uint8Array(initialData.buffer, initialData.byteOffset, initialData.byteLength);
      this.#shadow.set(bytes.subarray(0, Math.min(bytes.length, this.#shadow.length)));
      webgpu.WriteDeviceBuffer(this.#handle, this.#shadow);
    }

    return ALResult.S_OK;
  }

  /** Whether the buffer holds anything. */
  IsValid()
  {
    return this.#handle !== null;
  }

  /** The description this buffer was created from, or null. */
  GetDesc()
  {
    return this.#desc;
  }

  /** The buffer's size in bytes, as the description gives it. */
  GetSizeInBytes()
  {
    return this.#desc ? this.#desc.GetSizeInBytes() : 0;
  }

  /** The `GPUBuffer`, for binding it to a draw. */
  GetDeviceBuffer()
  {
    return this.#handle ? this.#webgpu.GetDeviceBuffer(this.#handle) : null;
  }

  /**
   * Opens the buffer for writing, returning the shadow to write into.
   *
   * Carbon returns `{ result, data }` from its stub and a raw pointer from the
   * backends; the stub's shape is the one Trinity callers already read.
   *
   * @param {object} _renderContext Unused; the device came from Create.
   * @returns {{result: number, data: Uint8Array|null}} The shadow.
   */
  MapForWriting(_renderContext)
  {
    if (!this.IsValid()) return { result: ALResult.E_INVALIDCALL, data: null };
    if (!HasFlag(this.#desc.cpuUsage, Tr2CpuUsage.WRITE)) return { result: ALResult.E_INVALIDCALL, data: null };

    // Every backend permits a second map; none permits a NESTED one, and a
    // nested map here would upload twice and hide which write won.
    if (this.#mapped) return { result: ALResult.E_INVALIDCALL, data: null };

    this.#mapped = true;

    return { result: ALResult.S_OK, data: this.#shadow };
  }

  /**
   * Closes the map and uploads the whole buffer.
   *
   * Uploading everything rather than a dirty range matches all three real
   * backends: DX11 `UpdateSubresource` on the whole buffer (cpp:400), DX12
   * `CopyBufferRegion` of `m_size` (Tr2ResourceHelper.cpp:234), Metal a blit of
   * `m_mtlBuffer.length` (mm:259).
   */
  UnmapForWriting()
  {
    if (!this.#mapped) return;

    this.#mapped = false;
    this.#webgpu.WriteDeviceBuffer(this.#handle, this.#shadow);
  }

  /**
   * Writes a range without a map.
   *
   * Carbon's stub refuses this for `WRITE_OFTEN` (`Tr2BufferALStub.cpp:138-141`)
   * and DX12 refuses it for a DYNAMIC buffer (`Tr2ResourceHelper.cpp:253-256`),
   * both because such a buffer's storage moves under a partial write. Ours does
   * not move, but the refusal is kept: a caller that reaches here with a
   * WRITE_OFTEN buffer has confused the two update paths, and every portable
   * caller uses map/unmap for those.
   *
   * @param {number} offset Byte offset of the range.
   * @param {number} size Bytes in the range.
   * @param {ArrayBufferView} data The bytes.
   * @param {object} _renderContext Unused; the device came from Create.
   * @returns {number} An `ALResult` value.
   */
  UpdateBuffer(offset, size, data, _renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (!HasFlag(this.#desc.cpuUsage, Tr2CpuUsage.WRITE)) return ALResult.E_INVALIDCALL;
    if (HasFlag(this.#desc.cpuUsage, Tr2CpuUsage.WRITE_OFTEN)) return ALResult.E_INVALIDCALL;
    if (!data) return ALResult.E_INVALIDARG;
    if (offset < 0 || size < 0 || offset + size > this.#shadow.length) return ALResult.E_INVALIDARG;

    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

    this.#shadow.set(bytes.subarray(0, size), offset);
    this.#webgpu.WriteDeviceBuffer(this.#handle, this.#shadow);

    return ALResult.S_OK;
  }

  /** Releases the GPU buffer and the shadow. */
  Destroy()
  {
    if (this.#handle) this.#handle.Destroy();

    this.#handle = null;
    this.#webgpu = null;
    this.#desc = null;
    this.#shadow = null;
    this.#mapped = false;
  }

  /** REFUSED: reading back needs MAP_READ, a staging buffer and an await. */
  MapForReading()
  {
    return { result: ALResult.E_INVALIDCALL, data: null };
  }

  /** @see MapForReading */
  UnmapForReading()
  {
  }
}
