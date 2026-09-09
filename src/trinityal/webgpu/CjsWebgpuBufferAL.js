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
// The shadow is RETAINED, not reallocated per map - which is DX11's behaviour
// specifically, not the family's. DX11 allocates `m_writeLockMemory` once and
// only if empty (`Tr2BufferALDx11.cpp:357-363`), so it survives across maps.
// DX12 STATIC calls CreateScratch on every map (`Tr2ResourceHelper.cpp:192`)
// and Metal plain WRITE makes a fresh MTLBuffer (`Tr2BufferALMetal.mm:233-237`)
// - both hand back UNINITIALISED scratch, which is only safe because on those
// backends plain-WRITE UpdateBuffer never goes through map/unmap at all.
// Retaining is what makes a partial update correct here, since our shadow is
// the authoritative copy between maps.
//
// CORRECTED 2026-09-08: this note previously cited dx11:419-429 and
// metal:293-302 as showing bytes outside a memcpy range surviving. Those lines
// are the WRITE_OFTEN arm, not the plain-WRITE arm this class imitates, and
// under WRITE_DISCARD DX11 does not preserve them either. The plain-WRITE arms
// are dx11:431-433 and metal:302-306. The decision was right; the citation
// pointed at a branch that did not demonstrate it.
//
// NOT IMPLEMENTED: MapForReading. Reading a buffer back needs MAP_READ, a
// separate staging buffer and an await, and nothing asks for it yet. It
// refuses by name rather than returning empty bytes.
import { ALResult, Tr2ALMemoryType } from "#trinityal";
import { Tr2CpuUsage, Tr2GpuUsage, HasFlag } from "#consts/render-context";


/** Carbon's "no descriptor heap index", as the stub buffer spells it. */
const NO_HEAP_INDEX = 0xffffffff;


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

    // Upload the RANGE, as every Carbon backend does for plain WRITE - DX11 a
    // D3D11_BOX (`Tr2BufferALDx11.cpp:431-433`), Metal a size-byte staging copy
    // (`Tr2BufferALMetal.mm:302-306`), DX12 a CopyBufferRegion of size at offset
    // (`Tr2ResourceHelper.cpp:258-266`). This used to write the whole shadow,
    // which was correct but paid the full buffer on every partial update.
    //
    // Widened outward to four-byte bounds because `queue.writeBuffer` requires
    // that alignment and D3D11_BOX does not. Widening is safe here and only
    // here: the shadow is RETAINED and authoritative, so the extra bytes on
    // each side are the same ones already on the device. The buffer size is
    // aligned at creation, so the widened end never runs past it.
    const start = offset & ~3;
    const end = Math.min((offset + size + 3) & ~3, this.#shadow.length);

    this.#webgpu.WriteDeviceBuffer(this.#handle, this.#shadow.subarray(start, end), start);

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

  /**
   * The buffer's size in bytes, under Carbon's name for the question.
   *
   * `GetSizeInBytes` above is this backend's own spelling and predates the
   * parity check. Both stay: the stub answers to `GetSize`
   * (`stub/Tr2BufferALStub.js`), so a caller written against one backend must
   * not fail against the other.
   *
   * @returns {number} Size in bytes.
   */
  GetSize()
  {
    return this.GetSizeInBytes();
  }

  /**
   * Which memory class this buffer occupies.
   *
   * MANAGED, as the stub buffer reports: WebGPU gives no placement control and
   * no residency signal, so the honest answer is the device-heap default rather
   * than a claim about video memory.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Fills in a device-resource description.
   *
   * Carbon's backends report size and memory class into the struct the resource
   * sweep walks; the base class's own version is empty
   * (`Tr2DeviceResourceAL.js`), and so is the stub's.
   *
   * @param {object} description The description to fill.
   * @returns {object} The description, filled.
   */
  Describe(description)
  {
    if (!description) return description;

    description.sizeInBytes = this.GetSize();
    description.memoryClass = this.GetMemoryClass();

    return description;
  }

  /**
   * Names the buffer for a debugger.
   *
   * `GPUObjectBase.label` is writable after creation, so unlike the stub this
   * one keeps the name where the browser's own error messages will quote it.
   *
   * @param {string} name The name to attach.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    const buffer = this.GetDeviceBuffer();

    if (buffer) buffer.label = String(name);

    return ALResult.S_OK;
  }

  /**
   * The buffer's index in a shader-resource descriptor heap.
   *
   * WebGPU HAS NO DESCRIPTOR HEAP - a resource is reached through a bind group,
   * not by index into a global table - so this reports Carbon's "not in a heap"
   * sentinel, as the stub does. It is not a gap to be filled later; there is
   * nothing for it to number.
   *
   * @returns {number} `NO_HEAP_INDEX`.
   */
  GetSrvIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /**
   * The buffer's index in an unordered-access descriptor heap.
   *
   * @returns {number} `NO_HEAP_INDEX`; see `GetSrvIndexInHeap`.
   */
  GetUavIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }
}
