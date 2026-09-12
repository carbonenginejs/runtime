// Source: trinity/trinityal/metal/MetalUtils.h
//   trinity/trinityal/metal/MetalUtils.mm:375-440
//
// Carbon's per-frame constant arena. Metal's `SetConstants` does not write into
// a buffer the constant buffer owns; it copies the bytes into a page of this
// allocator and binds `(page, offset)` (`MetalWorkQueue.mm:2396-2440`), and the
// allocator is reset at the start of every frame (`MetalContext.mm:473`). That
// is what gives each draw its own snapshot: a buffer locked three times and
// drawn three times lands in three regions, and the three draws read three
// different offsets.
//
// WHY THIS IS NOT OPTIONAL HERE. `queue.writeBuffer` into one GPUBuffer per
// constant buffer executes before the frame's command buffer is submitted, so
// every draw recorded in the frame would read the LAST write - every object
// drawn with the last object's transform. The arena is the fix Carbon already
// has, and the bind is a dynamic offset, which is WebGPU's spelling of Metal's
// `setVertexBufferOffset:` (`MetalWorkQueue.mm:2656-2659`).
//
// Pages are 2 MiB, as Carbon's are, and allocations are aligned to the larger
// of Carbon's 256 and the device's `minUniformBufferOffsetAlignment`, which a
// dynamic offset must be a multiple of.


import { CjsSchema } from "#schema";
function fail(message)
{
  const error = new Error(`CjsWebgpuConstantArena: ${message}`);
  error.code = "CJS_WEBGPU_CONSTANT_ARENA_INVALID";
  throw error;
}


/** `CONST_PAGE_SIZE` */
export const CONST_PAGE_SIZE = 2 * 1024 * 1024;

/** `CONST_ALIGNMENT` */
export const CONST_ALIGNMENT = 256;


/**
 * A per-frame arena of `GPUBuffer` pages that constant buffers are suballocated
 * into when they are bound.
 */
export class CjsWebgpuConstantArena
{
  /** m_pages: one `GPUBuffer` per page, created on first use. */
  m_pages = [];

  /** The current page index and the offset the next allocation takes. */
  m_page = 0;

  m_offset = 0;

  /** m_totalUploadedSize, for a stats line. */
  m_totalUploadedSize = 0;

  m_webgpu = null;

  m_alignment = CONST_ALIGNMENT;

  /**
   * @param {object} webgpu The `CjsWebgpuDevice`.
   */
  constructor(webgpu)
  {
    if (!webgpu) fail("a device is required");

    this.m_webgpu = webgpu;

    const limit = webgpu.GetDevice()?.limits?.minUniformBufferOffsetAlignment;

    if (Number.isInteger(limit) && limit > CONST_ALIGNMENT) this.m_alignment = limit;
  }

  /** Carbon's `Reset`: the next frame starts at page zero, offset zero. */
  Reset()
  {
    this.m_page = 0;
    this.m_offset = 0;
    this.m_totalUploadedSize = 0;
  }

  /**
   * Copies bytes into the arena and says where they landed.
   *
   * @param {Uint8Array} bytes The constants; may be shorter than `size`.
   * @param {number} size Bytes to reserve, at least the bytes' length.
   * @returns {{page: number, offset: number, size: number}} The region.
   */
  Allocate(bytes, size = bytes.byteLength)
  {
    const reserved = Math.ceil(Math.max(size, bytes.byteLength, 1) / this.m_alignment) * this.m_alignment;

    if (reserved > CONST_PAGE_SIZE) fail(`a constant buffer of ${size} bytes does not fit a ${CONST_PAGE_SIZE}-byte page`);

    if (this.m_offset + reserved > CONST_PAGE_SIZE)
    {
      this.m_totalUploadedSize += this.m_offset;
      this.m_page += 1;
      this.m_offset = 0;
    }

    const page = this.GetPage(this.m_page);
    const offset = this.m_offset;

    this.m_offset += reserved;

    // `writeBuffer` wants a four-byte-aligned length; the reserve is.
    this.m_webgpu.GetDevice().queue.writeBuffer(page, offset, bytes, 0, bytes.byteLength & ~3);

    return { page: this.m_page, offset, size: reserved };
  }

  /**
   * The `GPUBuffer` for a page, created on first use.
   *
   * @param {number} page The page index.
   * @returns {object} The buffer.
   */
  GetPage(page)
  {
    if (!this.m_pages[page]) this._CreatePage(page);

    return this.m_pages[page];
  }

  /**
   * Allocates one page's `GPUBuffer`, Carbon's `CreatePage`
   * (`MetalUtils.mm:432-439`).
   *
   * Carbon calls it from `Allocate` when the offset runs past the page and the
   * next page has never been made; ours is reached through `GetPage`, which is
   * the same "make it if it is not there" with one caller instead of two.
   *
   * @param {number} index The page index.
   * @returns {void}
   */
  _CreatePage(index)
  {
    const usage = this.m_webgpu.GetBufferUsage();

    this.m_pages[index] = this.m_webgpu.GetDevice().createBuffer({
      label: `Constant buffer page ${index}`,
      size: CONST_PAGE_SIZE,
      usage: usage.UNIFORM | usage.COPY_DST
    });
  }

  /** Bytes allocated this frame so far. */
  GetTotalUploadedSize()
  {
    return this.m_totalUploadedSize + this.m_offset;
  }

  /** Releases every page. */
  Destroy()
  {
    for (const page of this.m_pages) page?.destroy?.();

    this.m_pages = [];
    this.Reset();
  }
}


// DECLARED AS A CALL, NOT A DECORATOR. The abstraction layer is imported
// straight from source by its tests - `#trinityal/...` resolves to `src/` - and
// raw Node cannot parse decorator syntax, so a decorator here breaks every test
// that reaches this file without a build first. `CjsSchema.define` is the same
// metadata through the door the schema already provides for exactly this, and
// it keeps the layer free of the decorator chain it has never carried.
CjsSchema.define(CjsWebgpuConstantArena, { className: "CjsWebgpuConstantArena", carbon: "ConstantBufferAllocator" });
