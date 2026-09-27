// Source: trinity/trinityal/dx11/Tr2ConstantBufferALDx11.h
// Source: trinity/trinityal/dx11/Tr2ConstantBufferALDx11.cpp
// Source: trinity/trinityal/include/Tr2ConstantBufferAL.h
//
// The WebGL2 constant buffer: a uniform buffer, bound to a block per draw.
//
// dx11 has two kinds (`Tr2ConstantBufferALDx11.cpp:20-70`). A `ONE_SHOT` buffer
// is only a CPU mirror, which the render context consumes when it is bound. The
// others are a dynamic `D3D11_BIND_CONSTANT_BUFFER` buffer, mapped with
// `WRITE_DISCARD`. WebGL2's equivalent of that buffer is a `UNIFORM_BUFFER`
// bound with `bindBufferBase`, and the emitter declares one per constant
// register under its `std140` profile (`constantBufferStyle`), whose layout
// is dx11's: registers of four floats, packed contiguously.
//
// A uniform buffer cannot be mapped, so every usage keeps the mirror and
// `Unlock` uploads it; the discard becomes `bufferData`, which orphans the old
// storage instead of waiting for the GPU. The mirror also lets the render
// context set the constants as plain uniform arrays for a shader emitted with
// the `array` profile, which has no blocks.

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2ConstantUsageAL } from "../stub/Tr2ConstantBufferALStub.js";


/**
 * A constant buffer on a WebGL2 device.
 */
export class Tr2ConstantBufferALWebgl extends Tr2DeviceResourceAL
{
  /** m_buffer: the `WebGLBuffer`, or null for `ONE_SHOT`. */
  _buffer = null;

  /** m_bufferMirror: the constants on the CPU. See the head comment. */
  _bufferMirror = new Uint8Array(0);

  /** m_usage */
  _usage = Tr2ConstantUsageAL.REUSABLE;

  /** m_size */
  _size = 0;

  /** m_name */
  _name = "";

  /** The context the buffer was created on. */
  _gl = null;

  /**
   * Creates the constant buffer.
   *
   * @param {number} size Bytes.
   * @param {number} usage A `Tr2ConstantUsageAL` value.
   * @param {ArrayBufferView|null} initialData Initial contents, if any.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(size, usage, initialData, renderContext)
  {
    this._Reset();

    const al = RenderContextALOf(renderContext);
    if (!al || !al.GetWebgl()) return ALResult.E_FAIL;

    if (usage === Tr2ConstantUsageAL.IMMUTABLE && !initialData) return ALResult.E_INVALIDARG;

    this._bufferMirror = new Uint8Array(size);
    if (initialData)
    {
      const bytes = new Uint8Array(initialData.buffer, initialData.byteOffset, initialData.byteLength);
      this._bufferMirror.set(bytes.subarray(0, Math.min(bytes.length, size)));
    }

    if (usage !== Tr2ConstantUsageAL.ONE_SHOT)
    {
      const gl = al.GetWebgl();
      const buffer = gl.createBuffer();
      if (!buffer) return ALResult.E_OUTOFMEMORY;

      gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
      gl.bufferData(gl.UNIFORM_BUFFER, this._bufferMirror, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);

      this._gl = gl;
      this._buffer = buffer;
    }

    this._size = size;
    this._usage = usage;

    return ALResult.S_OK;
  }

  /**
   * Opens the constants for writing.
   *
   * Both of dx11's routes hand back CPU memory - the mirror for `ONE_SHOT`,
   * a discarded dynamic mapping otherwise. A uniform buffer cannot be mapped,
   * so both hand back the mirror here.
   *
   * @param {object} _renderContext The context to lock against.
   * @returns {{result: number, data: Uint8Array|null}} The locked memory.
   */
  @impl.adapted
  Lock(_renderContext)
  {
    if (this._usage === Tr2ConstantUsageAL.ONE_SHOT)
    {
      if (this._bufferMirror.length === 0) return { result: ALResult.E_FAIL, data: null };
      return { result: ALResult.S_OK, data: this._bufferMirror };
    }

    if (!this._buffer) return { result: ALResult.E_FAIL, data: null };

    return { result: ALResult.S_OK, data: this._bufferMirror };
  }

  /**
   * Closes the constants. A `ONE_SHOT` buffer stays on the CPU; the others
   * upload the mirror, orphaning the previous storage as `WRITE_DISCARD` does.
   *
   * @param {object} _renderContext The context the lock was made against.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Unlock(_renderContext)
  {
    if (this._usage === Tr2ConstantUsageAL.ONE_SHOT)
    {
      return this._bufferMirror.length === 0 ? ALResult.E_FAIL : ALResult.S_OK;
    }

    if (!this._buffer) return ALResult.E_FAIL;

    const gl = this._gl;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this._buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this._bufferMirror, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy`, before the registry is left. */
  _Reset()
  {
    if (this._gl && this._buffer) this._gl.deleteBuffer(this._buffer);

    this._buffer = null;
    this._bufferMirror = new Uint8Array(0);
    this._usage = Tr2ConstantUsageAL.REUSABLE;
    this._size = 0;
    this._gl = null;
  }

  /** Releases the buffer and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the buffer holds anything: dx11's rule, a size and either the
   * mirror (`ONE_SHOT`) or the device buffer.
   *
   * @returns {boolean} True when usable.
   */
  IsValid()
  {
    return this._size > 0 && (this._usage === Tr2ConstantUsageAL.ONE_SHOT || this._buffer !== null);
  }

  /**
   * The usage the buffer was created with.
   *
   * @returns {number} A `Tr2ConstantUsageAL` value.
   */
  GetUsage()
  {
    return this._usage;
  }

  /**
   * The buffer's size in bytes.
   *
   * @returns {number} Bytes.
   */
  GetSize()
  {
    return this._size;
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
   * Describes the buffer for the device-resource registry, with dx11's keys.
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2ConstantBufferAL";
    description.usage = String(this._usage);
    description.size = String(this._size);
    description.name = this._name;
  }

  /**
   * Names the buffer. WebGL has no debug names, so it is kept for `Describe`.
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
   * The uniform buffer the render context binds to a block, or null for
   * `ONE_SHOT`. dx11's render context reads `m_buffer` as a friend.
   *
   * @returns {WebGLBuffer|null} The buffer.
   */
  @impl.custom
  GetGpuResource()
  {
    return this._buffer;
  }

  /**
   * The constants on the CPU, for a `ONE_SHOT` bind or a uniform-array shader.
   * dx11's render context reads `m_bufferMirror` as a friend.
   *
   * @returns {Uint8Array} The mirror.
   */
  @impl.custom
  GetMirror()
  {
    return this._bufferMirror;
  }
}

CjsSchema.define(Tr2ConstantBufferALWebgl, { className: "Tr2ConstantBufferALWebgl", carbon: "Tr2ConstantBufferAL" });
