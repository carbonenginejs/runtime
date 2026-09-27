// Source: trinity/trinityal/dx11/Tr2BufferALDx11.h
// Source: trinity/trinityal/dx11/Tr2BufferALDx11.cpp
// Source: trinity/trinityal/include/Tr2BufferAL.h
//
// The WebGL2 buffer: vertex, index, typed and structured data.
//
// Ported from the dx11 backend, because WebGL2 is the same kind of API - an
// immediate-mode device where a buffer is created with a usage hint and written
// with a sub-data upload. The mapping is close to one to one:
//
// | dx11 | WebGL2 |
// |---|---|
// | `D3D11_USAGE_IMMUTABLE` | `STATIC_DRAW`, contents at `Create` |
// | `D3D11_USAGE_DYNAMIC` + `WRITE_DISCARD` | `DYNAMIC_DRAW`, orphaned by `bufferData` on unmap |
// | `WRITE_NO_OVERWRITE` | `bufferSubData` without orphaning |
// | `UpdateSubresource` | `bufferSubData` |
// | staging copy + `Map(READ)` | `getBufferSubData` into CPU memory |
// | shader-resource view | a data texture, below |
//
// THREE THINGS WEBGL2 DOES NOT HAVE, and what stands in for each:
//
// - NO TYPED OR STRUCTURED BUFFER VIEWS. A shader reads `Buffer<>` and
//   `StructuredBuffer<>` through `texelFetch` on a texture instead, laid out as
//   the DXBC-to-GLSL emitter addresses it: `dataTextureWidth` (2048) texels to
//   a row, element `i` at `(i & 2047, i >> 11)`, in the view format Carbon
//   binds (runtime `27f0a157`). So the shader-resource view here is a
//   `WebGLTexture`, refreshed from the buffer's bytes whenever they change.
// - NO UNORDERED ACCESS. WebGL2 has no storage buffers, so a buffer asking for
//   `UNORDERED_ACCESS` is refused at `Create`. The features that need one get
//   their own WebGL2 replacement above this layer (docs/research/
//   webgl-trinityal-backend.md).
// - NO INDIRECT DRAWS. A `DRAW_INDIRECT_ARGS` buffer keeps its bytes on the CPU
//   so the render context can read the arguments and issue a direct draw.
//
// So every buffer keeps a CPU copy of its bytes, `_writeLockMemory`. dx11
// keeps one too, but only for `WRITE` buffers between map and unmap; here it is
// the source the data texture and the indirect arguments are rebuilt from.
//
// WebGL restricts an index buffer to the `ELEMENT_ARRAY_BUFFER` and copy
// targets, and binding `ELEMENT_ARRAY_BUFFER` writes into the bound vertex
// array. Uploads and reads therefore go through `COPY_WRITE_BUFFER` and
// `COPY_READ_BUFFER`, which the render context never draws from; only the
// first bind, which fixes the buffer's type, uses the real target.

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { Tr2BufferDescriptionAL } from "../Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { RenderContextALOf } from "../renderContextAL.js";
import {
  GetBytesPerPixel,
  HasFlag,
  PixelFormat,
  Tr2CpuUsage,
  Tr2GpuUsage
} from "../../global/consts/renderContext/index.js";


/** Carbon's "no descriptor heap index". */
const NO_HEAP_INDEX = 0xffffffff;

/**
 * Texels to a data-texture row. The emitter's `dataTextureWidth`
 * (`resource/formats/webgl/core/glsl/DxbcGlslEmitter.js`); the two must agree.
 */
export const DATA_TEXTURE_WIDTH = 2048;

/**
 * The texel layout a buffer's shader-resource view is uploaded in, by the
 * buffer's view format.
 *
 * A typed view reads one element per texel in its own format. A structured
 * buffer - format `UNKNOWN` - is read four 32-bit words to a texel, the
 * emitter's `ld_structured` layout. dx11 views a raw (non-structured, `UNKNOWN`)
 * buffer as `R32_UINT` (`Tr2BufferALDx11.cpp:128-131`), and so does this.
 *
 * @param {WebGL2RenderingContext} gl The context whose enums to use.
 * @param {number} format A `PixelFormat` value.
 * @param {boolean} structured Whether the buffer is structured.
 * @returns {{internalFormat: number, format: number, type: number, bytes: number}|null}
 *   The layout, or null for a format no data texture can hold.
 */
export function DataTextureLayout(gl, format, structured)
{
  switch (format)
  {
    case PixelFormat.PIXEL_FORMAT_R32_FLOAT:
      return { internalFormat: gl.R32F, format: gl.RED, type: gl.FLOAT, bytes: 4 };
    case PixelFormat.PIXEL_FORMAT_R32_UINT:
      return { internalFormat: gl.R32UI, format: gl.RED_INTEGER, type: gl.UNSIGNED_INT, bytes: 4 };
    case PixelFormat.PIXEL_FORMAT_R32_SINT:
      return { internalFormat: gl.R32I, format: gl.RED_INTEGER, type: gl.INT, bytes: 4 };
    case PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT:
      return { internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, bytes: 16 };
    case PixelFormat.PIXEL_FORMAT_R32G32B32A32_UINT:
      return { internalFormat: gl.RGBA32UI, format: gl.RGBA_INTEGER, type: gl.UNSIGNED_INT, bytes: 16 };
    case PixelFormat.PIXEL_FORMAT_UNKNOWN:
      return structured
        ? { internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, bytes: 16 }
        : { internalFormat: gl.R32UI, format: gl.RED_INTEGER, type: gl.UNSIGNED_INT, bytes: 4 };
    default:
      return null;
  }
}


/**
 * A buffer on a WebGL2 device.
 */
export class Tr2BufferALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_buffer: the `WebGLBuffer`, or null. */
  _buffer = null;

  /**
   * m_staging: the bytes of the last read-back, kept between maps only for a
   * `READ_OFTEN` buffer, as dx11 keeps its staging buffer.
   */
  _staging = null;

  /** m_srv: the data texture a shader reads this buffer through, or null. */
  _srv = null;

  /** The data texture's layout, from `DataTextureLayout`. */
  _srvLayout = null;

  /** Whether the data texture is behind the buffer's bytes. */
  _srvDirty = false;

  /** m_desc */
  _desc = new Tr2BufferDescriptionAL();

  /** m_writeLockMemory: the buffer's bytes on the CPU. See the head comment. */
  _writeLockMemory = new Uint8Array(0);

  /** m_name */
  _name = "";

  /** The context the buffer was created on. */
  _gl = null;

  /** The target the buffer was first bound to, which fixes its type. */
  _target = 0;

  /**
   * Creates the buffer.
   *
   * Follows dx11 (`Tr2BufferALDx11.cpp:20-163`) in its order of checks and in
   * what it refuses, with one refusal of its own: `UNORDERED_ACCESS`, which
   * WebGL2 cannot provide.
   *
   * @param {Tr2BufferDescriptionAL} desc The buffer description.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(desc, initialData, renderContext)
  {
    this._Reset();

    let stride = desc.stride;
    if (desc.format !== PixelFormat.PIXEL_FORMAT_UNKNOWN) stride = GetBytesPerPixel(desc.format);

    if (desc.count === 0) return ALResult.E_INVALIDARG;

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_INVALIDCALL;

    // "An argument describes something the backend cannot represent."
    if (HasFlag(desc.gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS)) return ALResult.E_INVALIDARG;

    const isImmutable = !HasFlag(desc.cpuUsage, Tr2CpuUsage.WRITE)
      && !HasFlag(desc.cpuUsage, Tr2CpuUsage.WRITE_OFTEN);

    if (isImmutable && !initialData) return ALResult.E_INVALIDARG;

    const gl = al.GetWebgl2();
    const size = stride * desc.count;
    const usage = isImmutable ? gl.STATIC_DRAW
      : HasFlag(desc.cpuUsage, Tr2CpuUsage.WRITE_OFTEN) ? gl.DYNAMIC_DRAW
        : gl.STATIC_DRAW;

    this._writeLockMemory = new Uint8Array(size);
    if (initialData)
    {
      const bytes = new Uint8Array(initialData.buffer, initialData.byteOffset, initialData.byteLength);
      this._writeLockMemory.set(bytes.subarray(0, Math.min(bytes.length, size)));
    }

    const buffer = gl.createBuffer();
    if (!buffer) return ALResult.E_OUTOFMEMORY;

    this._gl = gl;
    this._buffer = buffer;
    this._target = HasFlag(desc.gpuUsage, Tr2GpuUsage.INDEX_BUFFER) ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
    this._BindTypeFixing();

    gl.bindBuffer(gl.COPY_WRITE_BUFFER, buffer);
    gl.bufferData(gl.COPY_WRITE_BUFFER, this._writeLockMemory, usage);
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, null);

    if (HasFlag(desc.gpuUsage, Tr2GpuUsage.SHADER_RESOURCE))
    {
      const structured = desc.format === PixelFormat.PIXEL_FORMAT_UNKNOWN
        && !HasFlag(desc.gpuUsage, Tr2GpuUsage.VERTEX_BUFFER)
        && !HasFlag(desc.gpuUsage, Tr2GpuUsage.INDEX_BUFFER);

      const layout = DataTextureLayout(gl, desc.format, structured);
      if (!layout)
      {
        this.Destroy();
        return ALResult.E_INVALIDARG;
      }

      this._srv = gl.createTexture();
      this._srvLayout = layout;
      this._srvDirty = true;
    }

    this._desc = desc;
    this._desc.stride = stride;

    return ALResult.S_OK;
  }

  /**
   * Binds the new buffer once to the target that fixes its type in WebGL.
   *
   * An index buffer is bound with no vertex array current, because binding
   * `ELEMENT_ARRAY_BUFFER` writes into whichever vertex array is bound; the
   * caller's bindings are put back afterwards.
   */
  @impl.custom
  _BindTypeFixing()
  {
    const gl = this._gl;

    if (this._target === gl.ELEMENT_ARRAY_BUFFER)
    {
      const vertexArray = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffer);
      gl.bindVertexArray(vertexArray);
      return;
    }

    const previous = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, previous);
  }

  /** Carbon's impl `Destroy`, before the registry is left. */
  _Reset()
  {
    const gl = this._gl;

    if (gl)
    {
      if (this._buffer) gl.deleteBuffer(this._buffer);
      if (this._srv) gl.deleteTexture(this._srv);
    }

    this._buffer = null;
    this._staging = null;
    this._srv = null;
    this._srvLayout = null;
    this._srvDirty = false;
    this._desc.count = 0;
    this._writeLockMemory = new Uint8Array(0);
    this._gl = null;
    this._target = 0;
  }

  /** Releases the buffer and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the buffer exists on the device.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._buffer !== null;
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
    return this._desc;
  }

  /**
   * The buffer's size in bytes: `GetDesc().count * GetDesc().stride`
   * (`src/Tr2BufferAL.cpp:112-115`).
   *
   * @returns {number} Bytes.
   */
  GetSize()
  {
    return this._desc.GetSizeInBytes();
  }

  /**
   * Maps the whole buffer, or a range of it, for reading.
   *
   * dx11 copies into a staging buffer and maps that; the WebGL2 equivalent is
   * `getBufferSubData`, which copies the device buffer into CPU memory. Like
   * dx11's `Map(READ)` it waits for the GPU.
   *
   * JavaScript has no out-parameter, so the mapped bytes come back beside the
   * result rather than through `data`, as every backend here returns them.
   *
   * @param {object} renderContext The context to map against.
   * @param {number} [offset] Byte offset of the range.
   * @param {number} [size] Bytes in the range; the whole buffer when omitted.
   * @returns {{result: number, data: Uint8Array|null}} The mapping.
   */
  @impl.adapted
  MapForReading(renderContext, offset = 0, size = 0)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid() || !this.IsValid()) return { result: ALResult.E_INVALIDCALL, data: null };

    const total = this._desc.stride * this._desc.count;
    const ranged = size !== 0 || offset !== 0;

    if (ranged && (size === 0 || offset + size > total)) return { result: ALResult.E_INVALIDARG, data: null };

    if (!HasFlag(this._desc.cpuUsage, Tr2CpuUsage.READ)) return { result: ALResult.E_INVALIDCALL, data: null };

    const length = ranged ? size : total;
    const staged = this.CreateStagingBuffer(length, renderContext);
    if (staged !== ALResult.S_OK) return { result: staged, data: null };

    const gl = this._gl;
    const view = this._staging.subarray(0, length);
    gl.bindBuffer(gl.COPY_READ_BUFFER, this._buffer);
    gl.getBufferSubData(gl.COPY_READ_BUFFER, ranged ? offset : 0, view);
    gl.bindBuffer(gl.COPY_READ_BUFFER, null);

    return { result: ALResult.S_OK, data: view };
  }

  /**
   * Makes sure the staging copy can hold `size` bytes, reusing a large enough
   * one as dx11 does (`Tr2BufferALDx11.cpp:170-200`). Like dx11 it sizes a new
   * one to the whole buffer rather than to `size`, so a later whole read reuses
   * it. The staging copy is CPU memory here: `getBufferSubData` reads into it.
   *
   * @param {number} size Bytes the read needs.
   * @param {object} _renderContext The context the read is made against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  CreateStagingBuffer(size, _renderContext)
  {
    if (this._staging && this._staging.length >= size) return ALResult.S_OK;

    this._staging = new Uint8Array(this._desc.stride * this._desc.count);
    return ALResult.S_OK;
  }

  /**
   * Ends a read mapping. As dx11 does, the staging copy is let go unless the
   * buffer is read often.
   *
   * @param {object} renderContext The context the map was made against.
   */
  UnmapForReading(renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid() || !this.IsValid()) return;
    if (!this._staging) return;

    if (!HasFlag(this._desc.cpuUsage, Tr2CpuUsage.READ_OFTEN)) this._staging = null;
  }

  /**
   * Maps the whole buffer for writing.
   *
   * Both of dx11's routes hand back CPU memory here: `WRITE_OFTEN` a discarded
   * dynamic mapping, `WRITE` the write-lock copy. WebGL2 cannot map device
   * memory, so both get `_writeLockMemory` and the upload happens at unmap.
   *
   * @param {object} renderContext The context to map against.
   * @returns {{result: number, data: Uint8Array|null}} The mapping.
   */
  @impl.adapted
  MapForWriting(renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid() || !this.IsValid()) return { result: ALResult.E_INVALIDCALL, data: null };

    if (!HasFlag(this._desc.cpuUsage, Tr2CpuUsage.WRITE_OFTEN) && !HasFlag(this._desc.cpuUsage, Tr2CpuUsage.WRITE))
    {
      return { result: ALResult.E_INVALIDCALL, data: null };
    }

    return { result: ALResult.S_OK, data: this._writeLockMemory };
  }

  /**
   * Ends a write mapping by uploading the whole buffer.
   *
   * `WRITE_OFTEN` without `NON_SYNCRONIZED_WRITE` is dx11's `WRITE_DISCARD`,
   * which becomes `bufferData`: the old storage is orphaned rather than waited
   * on. With it, and for `WRITE`, it is `bufferSubData` over the old storage,
   * dx11's `WRITE_NO_OVERWRITE` and `UpdateSubresource`.
   *
   * @param {object} renderContext The context the map was made against.
   */
  @impl.adapted
  UnmapForWriting(renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid() || !this.IsValid()) return;

    const gl = this._gl;
    const cpu = this._desc.cpuUsage;

    gl.bindBuffer(gl.COPY_WRITE_BUFFER, this._buffer);

    if (HasFlag(cpu, Tr2CpuUsage.WRITE_OFTEN) && !HasFlag(cpu, Tr2CpuUsage.NON_SYNCRONIZED_WRITE))
    {
      gl.bufferData(gl.COPY_WRITE_BUFFER, this._writeLockMemory, gl.DYNAMIC_DRAW);
    }
    else
    {
      gl.bufferSubData(gl.COPY_WRITE_BUFFER, 0, this._writeLockMemory);
    }

    gl.bindBuffer(gl.COPY_WRITE_BUFFER, null);

    if (this._srv) this._srvDirty = true;
  }

  /**
   * Writes a range of the buffer.
   *
   * dx11's two routes (`Tr2BufferALDx11.cpp:405-440`): a `WRITE_OFTEN` buffer
   * is mapped, copied into and unmapped; a `WRITE` buffer takes a boxed
   * `UpdateSubresource`, which is `bufferSubData` at the offset.
   *
   * @param {number} offset Byte offset of the range.
   * @param {number} size Bytes in the range.
   * @param {ArrayBufferView} data The bytes.
   * @param {object} renderContext The context to update against.
   * @returns {number} An `ALResult` value.
   */
  UpdateBuffer(offset, size, data, renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid() || !this.IsValid()) return ALResult.E_INVALIDCALL;

    if (offset + size > this._desc.stride * this._desc.count) return ALResult.E_INVALIDARG;

    if (size === 0) return ALResult.S_OK;

    const bytes = new Uint8Array(data.buffer, data.byteOffset, size);

    if (HasFlag(this._desc.cpuUsage, Tr2CpuUsage.WRITE_OFTEN))
    {
      const { result, data: mapped } = this.MapForWriting(renderContext);
      if (result !== ALResult.S_OK) return result;

      mapped.set(bytes, offset);
      this.UnmapForWriting(renderContext);
    }
    else if (HasFlag(this._desc.cpuUsage, Tr2CpuUsage.WRITE))
    {
      const gl = this._gl;

      this._writeLockMemory.set(bytes, offset);
      gl.bindBuffer(gl.COPY_WRITE_BUFFER, this._buffer);
      gl.bufferSubData(gl.COPY_WRITE_BUFFER, offset, bytes);
      gl.bindBuffer(gl.COPY_WRITE_BUFFER, null);

      if (this._srv) this._srvDirty = true;
    }
    else
    {
      return ALResult.E_INVALIDCALL;
    }

    return ALResult.S_OK;
  }

  /**
   * Where the shader-resource view sits in the descriptor heap.
   *
   * @returns {number} Carbon's "no index"; dx11 has no heap either.
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
   * Describes the buffer for the device-resource registry, with dx11's keys
   * (`Tr2BufferALDx11.cpp:455-465`).
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    const desc = this.GetDesc();

    description.type = "Tr2BufferAL";
    description.size = String(desc.count * desc.stride);
    description.cpuUsage = String(desc.cpuUsage);
    description.gpuUsage = String(desc.gpuUsage);
    description.format = String(desc.format);
    description.stride = String(desc.stride);
    description.count = String(desc.count);
    description.name = this._name;
  }

  /**
   * Names the buffer. WebGL has no debug names, so the name is kept for
   * `Describe` only.
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }

  /**
   * The native buffer, dx11's `GetGpuResource` returning the
   * `ID3D11Buffer`; here the `WebGLBuffer`.
   *
   * @returns {WebGLBuffer|null} The buffer.
   */
  GetGpuResource()
  {
    return this._buffer;
  }

  /**
   * The data texture a shader reads this buffer through, brought up to date
   * with the buffer's bytes first. The WebGL2 stand-in for binding dx11's
   * `m_srv`; see the head comment.
   *
   * The upload binds the texture on the active unit and puts that unit's
   * previous texture back.
   *
   * @returns {WebGLTexture|null} The texture, or null for a buffer with no
   *   shader-resource usage.
   */
  @impl.custom
  GetShaderResourceTexture()
  {
    if (!this._srv) return null;
    if (this._srvDirty) this._UploadShaderResource();
    return this._srv;
  }

  /** Rebuilds the data texture from `_writeLockMemory`. */
  @impl.custom
  _UploadShaderResource()
  {
    const gl = this._gl;
    const layout = this._srvLayout;
    const texels = Math.ceil(this._writeLockMemory.length / layout.bytes);
    const width = Math.min(texels, DATA_TEXTURE_WIDTH);
    const height = Math.ceil(texels / DATA_TEXTURE_WIDTH);
    const padded = new Uint8Array(width * height * layout.bytes);
    padded.set(this._writeLockMemory);

    const source = layout.type === gl.FLOAT ? new Float32Array(padded.buffer)
      : layout.type === gl.INT ? new Int32Array(padded.buffer)
        : new Uint32Array(padded.buffer);

    const previous = gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D, this._srv);
    gl.texImage2D(gl.TEXTURE_2D, 0, layout.internalFormat, width, height, 0, layout.format, layout.type, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, previous);

    this._srvDirty = false;
  }

  /**
   * The buffer's bytes on the CPU, which the render context reads indirect
   * draw arguments from. See the head comment.
   *
   * @returns {Uint8Array} The bytes.
   */
  @impl.custom
  GetCpuBytes()
  {
    return this._writeLockMemory;
  }
}

// The donor is NAMED: Carbon calls every backend's class `Tr2BufferAL` and
// carries the backend in the file name; we ship backends together, so the
// backend moves onto the class name (see Tr2BufferALStub.js).
CjsSchema.define(Tr2BufferALWebgl2, { className: "Tr2BufferALWebgl2", carbon: "Tr2BufferAL" });
