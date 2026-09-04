// Source: trinity/trinityal/stub/Tr2TextureALStub.cpp
// Source: trinity/trinityal/stub/Tr2TextureALStub.h
// Source: trinity/trinityal/include/Tr2TextureAL.h
//
// The GPU-free texture, ported from the one Carbon already ships.
//
// WHY THIS IS WORTH TRANSCRIBING RATHER THAN SUMMARISING. Carbon's stub texture
// refuses thirteen distinct combinations of description, GPU usage and CPU
// usage before it will call itself created - multisampled with unordered
// access, a cube with anything but six faces, a depth stencil with mips, a
// volume texture the CPU can touch, and so on. Each of those is a rule a real
// backend enforces too, and each one is a bug we would otherwise find on a GPU
// months later, in a form that looks like a driver problem rather than like a
// texture we should never have asked for.
//
// So the validation IS the port. The allocation behind it is real as well: a
// map returns a genuine buffer of the right pitch, so a caller reading pixels
// back headless reads the shape it would read on a device.
//
// THREE LANGUAGE DIFFERENCES.
//
// - Carbon has six `Create` overloads over one implementation; this takes the
//   implementation's arguments, with the optional ones in a description object.
// - Carbon's map functions return the result and hand back the pointer and the
//   pitch through reference arguments. JavaScript has no reference arguments,
//   so they return `{ result, data, pitch }`.
// - Carbon's impl-level `Destroy` only resets the fields, because the registry
//   entry goes when the C++ destructor runs. Ours must also unregister, so the
//   reset lives in a private helper that `Create` calls and `Destroy` calls the
//   base as well. See the head comment on `Tr2DeviceResourceAL.js`.
//
// TWO FAITHFUL EMPTINESSES, worth knowing before relying on them: Carbon's stub
// implements `Describe` as a no-op and returns null from `GetName`, so a stub
// texture contributes nothing to a device inventory. That is transcribed, not
// overlooked - a backend that reports real names is a real backend.

import { Tr2ALMemoryType, Tr2BaseDeviceResourceAL } from "./Tr2DeviceResourceAL.js";
import { ALResult } from "./ALResult.js";
import { Tr2BitmapDimensions } from "./Tr2BitmapDimensions.js";
import { Crop, Tr2MsaaDesc, Tr2TextureSubresource } from "./Tr2HalHelperStructures.js";
import {
  IsCompressedFormat,
  HasBufferFlags,
  HasFlag,
  IsWritable,
  TextureType,
  Tr2CpuUsage,
  Tr2GpuUsage
} from "../../../global/consts/renderContext/index.js";


/** Carbon's "no descriptor heap index", returned by both heap accessors. */
const NO_HEAP_INDEX = 0xffffffff;


/**
 * A texture that validates like a real one and holds its pixels on the CPU.
 */
export class Tr2TextureALStub extends Tr2BaseDeviceResourceAL
{
  /** m_desc */
  #desc = new Tr2BitmapDimensions();

  /** m_msaa */
  #msaa = new Tr2MsaaDesc();

  /** m_gpuUsage */
  #gpuUsage = Tr2GpuUsage.NONE;

  /** m_cpuUsage */
  #cpuUsage = Tr2CpuUsage.NONE;

  /** m_data - allocated on first map, released on unmap unless kept "often". */
  #data = null;

  /**
   * Creates the texture.
   *
   * Every refusal below is Carbon's, in Carbon's order
   * (`Tr2TextureALStub.cpp:18-95`).
   *
   * @param {Tr2BitmapDimensions} desc The texture description.
   * @param {object} options Creation options.
   * @param {number} [options.gpuUsage] A `Tr2GpuUsage` bit set.
   * @param {number} [options.cpuUsage] A `Tr2CpuUsage` bit set.
   * @param {Tr2MsaaDesc} [options.msaa] Multisample description.
   * @param {object[]} [options.initialData] Initial subresource data, if any.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  Create(desc, options, renderContext)
  {
    this.#Reset();

    const {
      gpuUsage = Tr2GpuUsage.NONE,
      cpuUsage = Tr2CpuUsage.NONE,
      msaa = new Tr2MsaaDesc(),
      initialData = null
    } = options;

    // A texture is not a buffer. Asking for one with vertex or index usage is
    // a mixed-up call, not a capability question.
    if (HasBufferFlags(gpuUsage)) return ALResult.E_INVALIDARG;

    if (!renderContext.IsValid()) return ALResult.E_FAIL;

    if (msaa.samples > 1)
    {
      // Multisampled resources cannot be written by a compute shader, cannot
      // be reached by the CPU, and only exist as 2D.
      if (HasFlag(gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS)) return ALResult.E_INVALIDARG;

      if (cpuUsage !== Tr2CpuUsage.NONE) return ALResult.E_INVALIDARG;

      if (desc.GetType() !== TextureType.TEX_TYPE_2D) return ALResult.E_INVALIDARG;
    }

    if (desc.GetType() !== TextureType.TEX_TYPE_2D)
    {
      // A cube is exactly six faces; nothing else that is not 2D is an array.
      if (desc.GetType() === TextureType.TEX_TYPE_CUBE)
      {
        if (desc.GetArraySize() !== 6) return ALResult.E_INVALIDARG;
      }
      else if (desc.GetArraySize() > 1)
      {
        return ALResult.E_INVALIDARG;
      }
    }

    if (desc.GetType() !== TextureType.TEX_TYPE_2D && HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL))
    {
      return ALResult.E_INVALIDARG;
    }

    if (msaa.samples > 1 && desc.GetTrueMipCount() > 1) return ALResult.E_INVALIDARG;

    if (HasFlag(gpuUsage, Tr2GpuUsage.RENDER_TARGET) && HasFlag(cpuUsage, Tr2CpuUsage.WRITE))
    {
      return ALResult.E_INVALIDARG;
    }

    if (HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL) && cpuUsage !== Tr2CpuUsage.NONE)
    {
      return ALResult.E_INVALIDARG;
    }

    if (HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL) && desc.GetTrueMipCount() > 1)
    {
      return ALResult.E_INVALIDARG;
    }

    if (desc.GetType() === TextureType.TEX_TYPE_3D && cpuUsage !== Tr2CpuUsage.NONE)
    {
      return ALResult.E_INVALIDARG;
    }

    // THE LAST ONE IS THE USEFUL ONE. A texture nothing can ever write - not
    // the GPU, not the CPU - and that arrives with no pixels is a texture that
    // will sample black forever. Carbon refuses it at creation rather than
    // letting it draw nothing.
    if (!IsWritable(gpuUsage) && !HasFlag(cpuUsage, Tr2CpuUsage.WRITE) && !initialData)
    {
      return ALResult.E_INVALIDARG;
    }

    this.#desc = desc;
    this.#gpuUsage = gpuUsage;
    this.#cpuUsage = cpuUsage;
    this.#msaa = msaa;

    return ALResult.S_OK;
  }

  /**
   * Adopts a texture shared by another device.
   *
   * Carbon's stub refuses: sharing needs a real device on both sides.
   *
   * @returns {number} An `ALResult` value.
   */
  OpenShared()
  {
    return ALResult.E_FAIL;
  }

  /** Carbon's impl `Destroy`: clears the description without unregistering. */
  #Reset()
  {
    this.#desc = new Tr2BitmapDimensions();
    this.#msaa = new Tr2MsaaDesc();
    this.#gpuUsage = Tr2GpuUsage.NONE;
    this.#cpuUsage = Tr2CpuUsage.NONE;
    this.#data = null;
  }

  /** Releases the texture and leaves the device-resource registry. */
  Destroy()
  {
    this.#Reset();
    super.Destroy();
  }

  /**
   * Whether the texture holds anything.
   *
   * Carbon's test is the width, because a created texture always has one.
   *
   * @returns {boolean} True when created.
   */
  IsValid()
  {
    return this.#desc.GetWidth() !== 0;
  }

  /**
   * Which memory class this texture occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * The texture description.
   *
   * @returns {Tr2BitmapDimensions} The description.
   */
  GetDesc()
  {
    return this.#desc;
  }

  /**
   * The multisample description.
   *
   * @returns {Tr2MsaaDesc} The description.
   */
  GetMsaaDesc()
  {
    return this.#msaa;
  }

  /**
   * The GPU usage this texture was created with.
   *
   * @returns {number} A `Tr2GpuUsage` bit set.
   */
  GetGpuUsage()
  {
    return this.#gpuUsage;
  }

  /**
   * The CPU usage this texture was created with.
   *
   * @returns {number} A `Tr2CpuUsage` bit set.
   */
  GetCpuUsage()
  {
    return this.#cpuUsage;
  }

  /**
   * Width of mip zero.
   *
   * @returns {number} Width in pixels.
   */
  GetWidth()
  {
    return this.#desc.GetWidth();
  }

  /**
   * Height of mip zero.
   *
   * @returns {number} Height in pixels.
   */
  GetHeight()
  {
    return this.#desc.GetHeight();
  }

  /**
   * Volume depth.
   *
   * @returns {number} Depth in slices.
   */
  GetDepth()
  {
    return this.#desc.GetDepth();
  }

  /**
   * The declared mip count.
   *
   * @returns {number} Mip levels as declared.
   */
  GetMipCount()
  {
    return this.#desc.GetMipCount();
  }

  /**
   * The mip count in effect.
   *
   * @returns {number} Mip levels.
   */
  GetTrueMipCount()
  {
    return this.#desc.GetTrueMipCount();
  }

  /**
   * The pixel format.
   *
   * @returns {number} A `PixelFormat` value.
   */
  GetFormat()
  {
    return this.#desc.GetFormat();
  }

  /**
   * The texture type.
   *
   * @returns {number} A `TextureType` value.
   */
  GetType()
  {
    return this.#desc.GetType();
  }

  /**
   * Slices in the array.
   *
   * @returns {number} Array size.
   */
  GetArraySize()
  {
    return this.#desc.GetArraySize();
  }

  /**
   * Bytes in one mip.
   *
   * @param {number} mip Mip level.
   * @returns {number} Size in bytes.
   */
  GetMipSize(mip)
  {
    return this.#desc.GetMipSize(mip);
  }

  /**
   * Allocates and returns the storage for one subresource, for reading.
   *
   * The CPU-read check comes FIRST, before validity, because a texture that
   * was never created for reading is a caller mistake rather than a state
   * problem - which is why it answers `E_INVALIDCALL` and not `E_FAIL`.
   *
   * @param {Tr2TextureSubresource} region The subresource to map.
   * @param {boolean} synchronize Whether to wait for outstanding GPU work.
   * @param {object} renderContext The context to map against.
   * @returns {{result: number, data: Uint8Array|null, pitch: number}} The mapping.
   */
  MapForReading(region, synchronize, renderContext)
  {
    if (!HasFlag(this.#cpuUsage, Tr2CpuUsage.READ)) return { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };

    if (!this.IsValid() || !renderContext.IsValid()) return { result: ALResult.E_FAIL, data: null, pitch: 0 };

    if (!region.IsValidForBitmap(this.#desc)) return { result: ALResult.E_INVALIDARG, data: null, pitch: 0 };

    if (!region.IsSingleSubresource()) return { result: ALResult.E_INVALIDARG, data: null, pitch: 0 };

    return this.#Allocate(region);
  }

  /** Releases a read mapping, keeping the buffer only for an "often" usage. */
  UnmapForReading()
  {
    this.#ReleaseUnlessKept();
  }

  /**
   * Allocates and returns the storage for one subresource, for writing.
   *
   * @param {Tr2TextureSubresource} region The subresource to map.
   * @param {object} renderContext The context to map against.
   * @returns {{result: number, data: Uint8Array|null, pitch: number}} The mapping.
   */
  MapForWriting(region, renderContext)
  {
    if (!HasFlag(this.#cpuUsage, Tr2CpuUsage.WRITE)) return { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };

    if (!this.IsValid() || !renderContext.IsValid()) return { result: ALResult.E_FAIL, data: null, pitch: 0 };

    if (!region.IsValidForBitmap(this.#desc)) return { result: ALResult.E_INVALIDARG, data: null, pitch: 0 };

    if (!region.IsSingleSubresource()) return { result: ALResult.E_INVALIDARG, data: null, pitch: 0 };

    // A partial write into a block format would land mid-block, so Carbon
    // refuses a box on a compressed texture rather than rounding it.
    if (region.HasBox() && IsCompressedFormat(this.#desc.GetFormat()))
    {
      return { result: ALResult.E_INVALIDARG, data: null, pitch: 0 };
    }

    return this.#Allocate(region);
  }

  /** Releases a write mapping, keeping the buffer only for an "often" usage. */
  UnmapForWriting()
  {
    this.#ReleaseUnlessKept();
  }

  /** Sizes the CPU buffer to one mip of the region and hands it back. */
  #Allocate(region)
  {
    const pitch = this.#desc.GetMipPitch(region.m_startMipLevel);
    const size = pitch * this.#desc.GetMipHeight(region.m_startMipLevel);

    if (this.#data === null || this.#data.length !== size) this.#data = new Uint8Array(size);

    // Carbon fails an allocation that came back empty; here that means a mip
    // whose pitch or height is zero, which is a region past the chain.
    if (this.#data.length === 0) return { result: ALResult.E_FAIL, data: null, pitch: 0 };

    return { result: ALResult.S_OK, data: this.#data, pitch };
  }

  /** Carbon keeps the buffer only when the usage says mapping is frequent. */
  #ReleaseUnlessKept()
  {
    if (!HasFlag(this.#cpuUsage, Tr2CpuUsage.READ_OFTEN) && !HasFlag(this.#cpuUsage, Tr2CpuUsage.WRITE_OFTEN))
    {
      this.#data = null;
    }
  }

  /**
   * Writes pixels into one subresource.
   *
   * A texture mapped often is written through a map, not through this, so
   * Carbon refuses `WRITE_OFTEN` here outright.
   *
   * @param {Tr2TextureSubresource} region The subresource to write.
   * @param {ArrayBufferView} source The pixels.
   * @param {number} pitch Bytes per row in the source.
   * @param {number} slicePitch Bytes per slice in the source.
   * @param {object} renderContext The context to write against.
   * @returns {number} An `ALResult` value.
   */
  UpdateSubresource(region, source, pitch, slicePitch, renderContext)
  {
    if (HasFlag(this.#cpuUsage, Tr2CpuUsage.WRITE_OFTEN)) return ALResult.E_INVALIDCALL;

    if (!HasFlag(this.#cpuUsage, Tr2CpuUsage.WRITE) && !IsWritable(this.#gpuUsage)) return ALResult.E_INVALIDCALL;

    if (!this.IsValid() || !renderContext.IsValid()) return ALResult.E_INVALIDCALL;

    if (!region.IsValidForBitmap(this.#desc)) return ALResult.E_INVALIDARG;

    if (!region.IsSingleSubresource()) return ALResult.E_INVALIDARG;

    return ALResult.S_OK;
  }

  /**
   * Copies a region from another texture.
   *
   * A whole-to-whole copy short-circuits; anything else must survive `Crop`,
   * which is where a mismatched face count or an empty overlap is caught.
   *
   * @param {Tr2TextureSubresource} destSubresource The region to write.
   * @param {Tr2TextureALStub} source The texture to read.
   * @param {Tr2TextureSubresource} sourceSubresource The region to read.
   * @param {object} renderContext The context to copy against.
   * @returns {number} An `ALResult` value.
   */
  CopySubresourceRegion(destSubresource, source, sourceSubresource, renderContext)
  {
    if (!this.IsValid() || !renderContext.IsValid()) return ALResult.E_INVALIDCALL;

    if (!source.IsValid()) return ALResult.E_INVALIDARG;

    if (!HasFlag(this.#cpuUsage, Tr2CpuUsage.WRITE) && !IsWritable(this.#gpuUsage)) return ALResult.E_INVALIDCALL;

    if (destSubresource.IsSubresourceFull(this.#desc) && sourceSubresource.IsSubresourceFull(source.GetDesc()))
    {
      return ALResult.S_OK;
    }

    // Crop mutates, so both regions are copied first - Carbon takes them by
    // value here and a caller's region must survive the call unchanged.
    const src = CopyRegion(sourceSubresource);
    const dst = CopyRegion(destSubresource);

    if (!Crop(src, source.GetDesc(), dst, this.#desc)) return ALResult.E_FAIL;

    return ALResult.S_OK;
  }

  /**
   * Regenerates the mip chain.
   *
   * Only a texture that is both a render target and a shader resource can be
   * generated into, because that is how the hardware does it.
   *
   * @returns {number} An `ALResult` value.
   */
  GenerateMipMaps()
  {
    if (!HasFlag(this.#gpuUsage, Tr2GpuUsage.RENDER_TARGET) || !HasFlag(this.#gpuUsage, Tr2GpuUsage.SHADER_RESOURCE))
    {
      return ALResult.E_INVALIDCALL;
    }

    return ALResult.S_OK;
  }

  /**
   * Resolves a multisampled texture into a single-sampled one.
   *
   * With one sample there is nothing to resolve, so Carbon falls back to a
   * plain copy - and inherits that copy's validation with it.
   *
   * @param {Tr2TextureALStub} destination The texture to resolve into.
   * @param {object} renderContext The context to resolve against.
   * @returns {number} An `ALResult` value.
   */
  Resolve(destination, renderContext)
  {
    if (this.#msaa.samples <= 1)
    {
      return destination.CopySubresourceRegion(
        new Tr2TextureSubresource(),
        this,
        new Tr2TextureSubresource(),
        renderContext
      );
    }

    if (!this.IsValid() || !renderContext.IsValid()) return ALResult.E_INVALIDCALL;

    if (!destination.IsValid()) return ALResult.E_INVALIDARG;

    if (!HasFlag(destination.GetCpuUsage(), Tr2CpuUsage.WRITE) && !IsWritable(destination.GetGpuUsage()))
    {
      return ALResult.E_INVALIDARG;
    }

    if (this.#desc.GetWidth() !== destination.GetWidth() || this.#desc.GetHeight() !== destination.GetHeight())
    {
      return ALResult.E_INVALIDARG;
    }

    if (this.#desc.GetFormat() !== destination.GetFormat()) return ALResult.E_INVALIDARG;

    if (destination.GetMsaaDesc().samples > 1) return ALResult.E_INVALIDARG;

    return ALResult.S_OK;
  }

  /**
   * The handle another device could open this texture by.
   *
   * @returns {number} Always zero; the stub shares nothing.
   */
  GetSharedHandle()
  {
    return 0;
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
   * Names the texture for a debugger.
   *
   * @returns {number} An `ALResult` value; the stub keeps no name.
   */
  SetName()
  {
    return ALResult.S_OK;
  }

  /**
   * The debug name.
   *
   * @returns {null} Always null, as Carbon's stub returns.
   */
  GetName()
  {
    return null;
  }
}


/**
 * Copies a subresource region, so a call that crops does not alter its caller.
 *
 * @param {Tr2TextureSubresource} region The region to copy.
 * @returns {Tr2TextureSubresource} An independent copy.
 */
export function CopyRegion(region)
{
  const copy = new Tr2TextureSubresource();

  copy.m_startFace = region.m_startFace;
  copy.m_endFace = region.m_endFace;
  copy.m_startMipLevel = region.m_startMipLevel;
  copy.m_endMipLevel = region.m_endMipLevel;
  copy.m_box.left = region.m_box.left;
  copy.m_box.top = region.m_box.top;
  copy.m_box.front = region.m_box.front;
  copy.m_box.right = region.m_box.right;
  copy.m_box.bottom = region.m_box.bottom;
  copy.m_box.back = region.m_box.back;

  return copy;
}
