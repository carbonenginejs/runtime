// Source: trinity/trinityal/include/Tr2TextureAL.h
//   trinity/trinityal/metal/Tr2TextureALMetal.mm
//   trinity/trinityal/stub/Tr2TextureALStub.cpp
//
// A `Tr2TextureAL` holding a real `GPUTexture`.
//
// CREATED WITH ITS DATA, NEVER UPDATED INTO. Carbon's texture resource creates
// its texture from the decoded bitmap with one `Tr2SubresourceData` per
// (mip, layer), indexed `mip + layer * mipCount`
// (`Tr2ImageIOHelpers.cpp:104-128`), and Metal uploads them one
// `replaceRegion` per (slice, mip) (`Tr2TextureALMetal.mm:140-268`). This does
// the same with one `writeTexture` per subresource.
//
// THE sRGB VIEW IS A FORMAT-REINTERPRETING VIEW, as Metal's is: `MetalContext.mm:342-357`
// makes `newTextureViewWithPixelFormat:` of the sRGB sibling for RGBA8, BGRA8,
// BC1, BC2, BC3 and BC7, and `GetSRGBViewMetalTexture()` is what a
// `COLOR_SPACE_SRGB` SRV binds. WebGPU needs the sibling declared in
// `viewFormats` at creation, so it is.
//
// FIELDS ARE PUBLIC AND CARBON-NAMED, for the reason recorded on `CjsWebgpuShaderAL`.
import { CjsSchema } from "#schema";
import { ALResult, CopyRegion, Crop, Tr2ALMemoryType, Tr2MsaaDesc, Tr2TextureSubresource } from "#trinityal";
import { PixelFormat, TextureType, Tr2CpuUsage, Tr2GpuUsage, HasFlag, IsWritable } from "#consts/render-context";
import { RenderContextALOf } from "../renderContextAL.js";

const NO_HEAP_INDEX = 0xffffffff;

/** Carbon texture type to WebGPU's view dimension for the texture as a whole. */
const VIEW_DIMENSION_OF_TYPE = Object.freeze({
  [TextureType.TEX_TYPE_2D]: "2d",
  [TextureType.TEX_TYPE_CUBE]: "cube",
  [TextureType.TEX_TYPE_3D]: "3d"
});


/**
 * A `Tr2TextureAL` backed by a WebGPU `GPUTexture`, created with all of its data.
 */
export class CjsWebgpuTextureAL
{
  /** m_desc, a `Tr2BitmapDimensions`. */
  m_desc = null;

  m_msaa = new Tr2MsaaDesc();

  m_gpuUsage = Tr2GpuUsage.NONE;

  m_cpuUsage = Tr2CpuUsage.NONE;

  /** The `GPUTexture`, or null before Create. */
  m_texture = null;

  /** The `GPUTextureFormat` it was created with. */
  m_format = null;

  /** The sRGB sibling format, when the format has one and a view of it exists. */
  m_srgbFormat = null;

  /** Views by `dimension:colorSpace`, made on first request. */
  m_views = new Map();

  m_webgpu = null;

  m_name = "";

  /**
   * Creates the texture and uploads its initial data.
   *
   * @param {object} desc A `Tr2BitmapDimensions`.
   * @param {object} options `{ gpuUsage, cpuUsage, msaa, initialData }`;
   *   `initialData` is an array of `Tr2SubresourceData`
   *   indexed `mip + layer * mipCount`, as Carbon's is.
   * @param {object} renderContext The render context, Trinity's or the AL.
   * @returns {number} An `ALResult` value.
   */
  Create(desc, options, renderContext)
  {
    this.Destroy();

    const { gpuUsage = Tr2GpuUsage.NONE, cpuUsage = Tr2CpuUsage.NONE, msaa = new Tr2MsaaDesc(), initialData = null } = options ?? {};
    const al = RenderContextALOf(renderContext);

    if (!al || !al.IsValid()) return ALResult.E_FAIL;
    if (!desc || desc.GetWidth() === 0 || desc.GetHeight() === 0) return ALResult.E_INVALIDARG;
    if (msaa.samples > 1) return ALResult.E_INVALIDARG;

    const type = desc.GetType();
    const dimension = VIEW_DIMENSION_OF_TYPE[type];

    if (!dimension) return ALResult.E_INVALIDARG;
    if (type === TextureType.TEX_TYPE_CUBE && desc.GetArraySize() % 6 !== 0) return ALResult.E_INVALIDARG;

    // Carbon's own rule (the stub's last check): a texture nothing can ever
    // write that arrives with no pixels samples black forever. Refused.
    const writable = HasFlag(gpuUsage, Tr2GpuUsage.RENDER_TARGET) || HasFlag(gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS)
      || HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL) || HasFlag(cpuUsage, Tr2CpuUsage.WRITE);

    if (!writable && !initialData) return ALResult.E_INVALIDARG;

    const format = al.m_utils.GetGPUTextureFormat(desc.GetFormat());

    if (!format) return ALResult.E_INVALIDARG;

    const webgpu = al.GetWebgpu();
    if (!webgpu) return ALResult.E_INVALIDCALL;

    const device = webgpu.GetDevice();
    const usageFlags = webgpu.GetTextureUsage();
    const srgbFormat = al.m_utils.GetSRGBViewFormat(format);
    const mipCount = Math.max(1, desc.GetTrueMipCount());
    const layers = type === TextureType.TEX_TYPE_3D ? Math.max(1, desc.GetDepth()) : Math.max(1, desc.GetArraySize());
    let usage = usageFlags.TEXTURE_BINDING | usageFlags.COPY_DST;

    if (HasFlag(gpuUsage, Tr2GpuUsage.RENDER_TARGET) || HasFlag(gpuUsage, Tr2GpuUsage.DEPTH_STENCIL))
    {
      usage |= usageFlags.RENDER_ATTACHMENT ?? 0;
    }

    // An unordered-access texture is written by compute through a storage
    // binding; D3D's UAV is WebGPU's STORAGE_BINDING.
    if (HasFlag(gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS)) usage |= usageFlags.STORAGE_BINDING ?? 0;

    // A texture something renders or computes into is also a copy source, as
    // D3D resources are without a flag: CopySubresourceRegion reads it.
    if (HasFlag(gpuUsage, Tr2GpuUsage.RENDER_TARGET) || HasFlag(gpuUsage, Tr2GpuUsage.UNORDERED_ACCESS))
    {
      usage |= usageFlags.COPY_SRC ?? 0;
    }

    this.m_texture = device.createTexture({
      label: this.m_name || "Tr2TextureAL",
      size: { width: desc.GetWidth(), height: desc.GetHeight(), depthOrArrayLayers: layers },
      mipLevelCount: mipCount,
      sampleCount: 1,
      dimension: type === TextureType.TEX_TYPE_3D ? "3d" : "2d",
      format,
      usage,
      ...(srgbFormat ? { viewFormats: [ srgbFormat ] } : {})
    });
    this.m_format = format;
    this.m_srgbFormat = srgbFormat;
    this.m_desc = desc;
    this.m_msaa = msaa;
    this.m_gpuUsage = gpuUsage;
    this.m_cpuUsage = cpuUsage;
    this.m_webgpu = webgpu;

    if (initialData) this._Upload(initialData, mipCount, type);

    return ALResult.S_OK;
  }

  /** One `writeTexture` per subresource, Carbon's `mip + layer * mipCount` order. */
  _Upload(initialData, mipCount, type)
  {
    const desc = this.m_desc;
    const queue = this.m_webgpu.GetDevice().queue;
    const layerCount = type === TextureType.TEX_TYPE_3D ? 1 : Math.max(1, desc.GetArraySize());

    for (let layer = 0; layer < layerCount; layer += 1)
    {
      for (let mip = 0; mip < mipCount; mip += 1)
      {
        const subresource = initialData[mip + layer * mipCount];

        if (!subresource || !subresource.m_sysMem) continue;

        const bytes = subresource.m_sysMem;
        const pitch = subresource.m_sysMemPitch;
        const slicePitch = subresource.m_sysMemSlicePitch || bytes.byteLength;
        const depth = type === TextureType.TEX_TYPE_3D ? Math.max(1, desc.GetMipDepth(mip)) : 1;

        queue.writeTexture(
          { texture: this.m_texture, mipLevel: mip, origin: { x: 0, y: 0, z: layer } },
          bytes,
          { offset: 0, bytesPerRow: pitch, rowsPerImage: pitch ? Math.max(1, Math.floor(slicePitch / pitch)) : undefined },
          { width: desc.GetMipWidth(mip), height: desc.GetMipHeight(mip), depthOrArrayLayers: depth }
        );
      }
    }
  }

  /**
   * The view a resource set binds: linear or sRGB, in the layout's dimension.
   *
   * Metal's `GetMetalTexture()` / `GetSRGBViewMetalTexture()`
   * (`Tr2TextureALMetal.h:49-54`), with the dimension added because a WebGPU
   * view must name it and a cube texture is legitimately bound as a 2d-array.
   *
   * @param {string} [viewDimension] A `GPUTextureViewDimension`.
   * @param {number} [colorSpace] A `Tr2ColorSpace`; non-zero means sRGB.
   * @returns {object|null} A `GPUTextureView`, or null before Create.
   */
  GetDeviceTextureView(viewDimension = VIEW_DIMENSION_OF_TYPE[this.m_desc?.GetType()] ?? "2d", colorSpace = 0)
  {
    if (!this.m_texture) return null;

    const srgb = colorSpace !== 0 && this.m_srgbFormat !== null;
    const key = `${viewDimension}:${srgb ? "srgb" : "linear"}`;
    let view = this.m_views.get(key) ?? null;

    if (!view)
    {
      view = this.m_texture.createView({
        label: `${this.m_name || "Tr2TextureAL"} ${key}`,
        dimension: viewDimension,
        ...(srgb ? { format: this.m_srgbFormat } : {})
      });
      this.m_views.set(key, view);
    }

    return view;
  }

  /**
   * The view a storage (UAV) binding writes: ONE mip level, every layer.
   *
   * Carbon binds a UAV at a mip (`Tr2ResourceSetDescriptionAL::SetUav`'s
   * `mip`), and a WebGPU storage view must name exactly one. A cube is bound
   * as a 2d-array of its faces, which is how a compute shader writes one.
   *
   * @param {string} viewDimension The binding's `storageTexture.viewDimension`.
   * @param {number} mip The mip level.
   * @returns {GPUTextureView|null} The view, or null before Create.
   */
  GetDeviceStorageView(viewDimension, mip)
  {
    if (!this.m_texture) return null;

    const key = `storage:${viewDimension}:${mip}`;
    let view = this.m_views.get(key) ?? null;

    if (!view)
    {
      view = this.m_texture.createView({
        label: `${this.m_name || "Tr2TextureAL"} ${key}`,
        dimension: viewDimension,
        baseMipLevel: mip,
        mipLevelCount: 1
      });
      this.m_views.set(key, view);
    }

    return view;
  }

  /** The `GPUTexture`; Metal's `GetMetalTexture` under this backend's name. */
  GetDeviceTexture()
  {
    return this.m_texture;
  }

  /** Whether the texture holds a `GPUTexture`. */
  IsValid()
  {
    return this.m_texture !== null;
  }

  /** Shared textures need a native handle WebGPU does not expose; always fails. */
  OpenShared()
  {
    return ALResult.E_FAIL;
  }

  /** The `Tr2BitmapDimensions` this texture was created from, or null. */
  GetDesc()
  {
    return this.m_desc;
  }

  /** The multisample description; this backend creates single-sampled textures. */
  GetMsaaDesc()
  {
    return this.m_msaa;
  }

  /** The `Tr2GpuUsage` flags it was created with. */
  GetGpuUsage()
  {
    return this.m_gpuUsage;
  }

  /** The `Tr2CpuUsage` flags it was created with. */
  GetCpuUsage()
  {
    return this.m_cpuUsage;
  }

  /** Width in texels of mip zero, or zero before Create. */
  GetWidth()
  {
    return this.m_desc ? this.m_desc.GetWidth() : 0;
  }

  /** Height in texels of mip zero, or zero before Create. */
  GetHeight()
  {
    return this.m_desc ? this.m_desc.GetHeight() : 0;
  }

  /** Depth in texels of mip zero, which is one unless the texture is 3D. */
  GetDepth()
  {
    return this.m_desc ? this.m_desc.GetDepth() : 0;
  }

  /** The mip count requested at creation, which may be zero for a full chain. */
  GetMipCount()
  {
    return this.m_desc ? this.m_desc.GetMipCount() : 0;
  }

  /** The mip count actually created, with a requested zero resolved. */
  GetTrueMipCount()
  {
    return this.m_desc ? this.m_desc.GetTrueMipCount() : 0;
  }

  /** The Carbon `PixelFormat`, or `PIXEL_FORMAT_UNKNOWN` before Create. */
  GetFormat()
  {
    return this.m_desc ? this.m_desc.GetFormat() : PixelFormat.PIXEL_FORMAT_UNKNOWN;
  }

  /** The Carbon `TextureType`, or `TEX_TYPE_INVALID` before Create. */
  GetType()
  {
    return this.m_desc ? this.m_desc.GetType() : TextureType.TEX_TYPE_INVALID;
  }

  /** The layer count, which for a cube counts its six faces. */
  GetArraySize()
  {
    return this.m_desc ? this.m_desc.GetArraySize() : 0;
  }

  /**
   * The byte size of one mip across all layers.
   *
   * @param {number} level The mip level.
   * @returns {number} Its size in bytes, or zero before Create.
   */
  GetMipSize(level)
  {
    return this.m_desc ? this.m_desc.GetMipSize(level) : 0;
  }

  /** Reading back needs a staging buffer and an await; refused by name. */
  MapForReading(_region, _synchronize, _renderContext)
  {
    return { result: ALResult.E_FAIL, data: null, pitch: 0 };
  }

  /** Paired with `MapForReading`, which this backend refuses. */
  UnmapForReading(_renderContext)
  {
    return ALResult.E_FAIL;
  }

  /** The CPU copy a write mapping hands out; kept between maps for WRITE_OFTEN. */
  _mappedData = null;

  /** The subresource the current write mapping covers, or null when unmapped. */
  _mappedRegion = null;

  /**
   * Hands out memory for writing one subresource, Carbon's `MapForWriting`,
   * with the stub's checks (`Tr2TextureALStub.MapForWriting`).
   *
   * WebGPU has no mappable texture memory, so the memory is a CPU copy of the
   * mip, uploaded by `UnmapForWriting` with `queue.writeTexture` - the shape
   * this backend's constant buffers already use. The copy starts zeroed, not
   * with the texture's contents, because WebGPU cannot read a texture back
   * synchronously; so a region with a box is refused rather than letting the
   * upload overwrite the texels outside it. `Tr2DataTextureManager` maps the
   * whole of subresource 0.
   *
   * @param {object} region A `Tr2TextureSubresource`.
   * @param {object} renderContext The render context, Trinity's or the AL.
   * @returns {{result: number, data: Uint8Array|null, pitch: number}} The mapping.
   */
  MapForWriting(region, renderContext)
  {
    if (!HasFlag(this.m_cpuUsage, Tr2CpuUsage.WRITE)) return { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };

    const al = RenderContextALOf(renderContext);

    if (!this.IsValid() || !al || !al.IsValid()) return { result: ALResult.E_FAIL, data: null, pitch: 0 };
    if (!region.IsValidForBitmap(this.m_desc) || !region.IsSingleSubresource() || region.HasBox())
    {
      return { result: ALResult.E_INVALIDARG, data: null, pitch: 0 };
    }

    const mip = region.m_startMipLevel;
    const pitch = this.m_desc.GetMipPitch(mip);
    const size = pitch * this.m_desc.GetMipHeight(mip);

    if (size === 0) return { result: ALResult.E_FAIL, data: null, pitch: 0 };
    if (this._mappedData === null || this._mappedData.length !== size) this._mappedData = new Uint8Array(size);

    this._mappedRegion = region;

    return { result: ALResult.S_OK, data: this._mappedData, pitch };
  }

  /**
   * Uploads what was written into the mapping, Carbon's `UnmapForWriting`.
   * The CPU copy is kept for the next map only when the texture was created
   * `WRITE_OFTEN`, as the stub keeps its buffer.
   *
   * @param {object} renderContext The render context, Trinity's or the AL.
   * @returns {number} An `ALResult` value.
   */
  UnmapForWriting(renderContext)
  {
    if (this._mappedRegion === null) return ALResult.E_INVALIDCALL;

    const region = this._mappedRegion;
    const mip = region.m_startMipLevel;
    const pitch = this.m_desc.GetMipPitch(mip);
    const result = this.UpdateSubresource(region, this._mappedData, pitch, pitch * this.m_desc.GetMipHeight(mip), renderContext);

    this._mappedRegion = null;
    if (!HasFlag(this.m_cpuUsage, Tr2CpuUsage.WRITE_OFTEN)) this._mappedData = null;

    return result;
  }

  /**
   * Replaces one mip of one slice, Carbon's `UpdateSubresource`.
   *
   * @param {object} region A `Tr2TextureSubresource` naming one mip and slice.
   * @param {ArrayBufferView} source The texels.
   * @param {number} pitch Bytes per row.
   * @param {number} slicePitch Bytes per slice.
   * @returns {number} An `ALResult` value.
   */
  UpdateSubresource(region, source, pitch, slicePitch, _renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (!region || !source) return ALResult.E_INVALIDARG;

    const mip = region.m_startMipLevel ?? 0;
    const layer = region.m_startFace ?? 0;

    this.m_webgpu.GetDevice().queue.writeTexture(
      { texture: this.m_texture, mipLevel: mip, origin: { x: 0, y: 0, z: layer } },
      source,
      { offset: 0, bytesPerRow: pitch, rowsPerImage: pitch ? Math.max(1, Math.floor((slicePitch || source.byteLength) / pitch)) : undefined },
      { width: this.m_desc.GetMipWidth(mip), height: this.m_desc.GetMipHeight(mip), depthOrArrayLayers: 1 }
    );

    return ALResult.S_OK;
  }

  /**
   * Copies a region of another texture into this one, as Metal does
   * (`Tr2TextureALMetal.mm:744-791`): validate, crop both regions against their
   * textures, then one work-queue copy per slice and mip.
   *
   * @param {Tr2TextureSubresource} destSubresource The region to write.
   * @param {CjsWebgpuTextureAL} source The texture to read.
   * @param {Tr2TextureSubresource} sourceSubresource The region to read.
   * @param {object} renderContext The context whose work queue records it.
   * @returns {number} An `ALResult` value.
   */
  CopySubresourceRegion(destSubresource, source, sourceSubresource, renderContext)
  {
    if (!this.IsValid() || !renderContext?.IsValid()) return ALResult.E_INVALIDCALL;
    if (!source?.IsValid()) return ALResult.E_INVALIDARG;
    if (!HasFlag(this.m_cpuUsage, Tr2CpuUsage.WRITE) && !IsWritable(this.m_gpuUsage)) return ALResult.E_INVALIDCALL;

    // Carbon takes both regions by value and Crop mutates them.
    const src = CopyRegion(sourceSubresource);
    const dst = CopyRegion(destSubresource);

    if (!Crop(src, source.m_desc, dst, this.m_desc)) return ALResult.E_FAIL;

    const queue = RenderContextALOf(renderContext).GetWorkQueue();
    const slices = src.m_endFace - src.m_startFace;
    const mips = src.m_endMipLevel - src.m_startMipLevel;

    for (let slice = 0; slice < slices; ++slice)
    {
      for (let mip = 0; mip < mips; ++mip)
      {
        queue.CopyTextureToTexture(
          source.m_texture,
          src.m_startFace + slice,
          src.m_startMipLevel + mip,
          { x: src.m_box.left, y: src.m_box.top, z: src.m_box.front },
          { width: src.GetWidth(), height: src.GetHeight(), depthOrArrayLayers: src.GetDepth() },
          this.m_texture,
          dst.m_startFace + slice,
          dst.m_startMipLevel + mip,
          { x: dst.m_box.left, y: dst.m_box.top, z: dst.m_box.front }
        );
      }
    }

    return ALResult.S_OK;
  }

  /**
   * Regenerates the mip chain, as Metal's `GenerateMipMaps` does
   * (`Tr2TextureALMetal.mm:795-805`): only a render target that is also a
   * shader resource can be, and the work queue encodes it. WebGPU has no
   * generator of its own, so the context's CjsWebgpuMipGenerator stands in for
   * Metal's blit encoder.
   *
   * @param {object} renderContext The context whose work queue encodes it.
   * @returns {number} An `ALResult` value.
   */
  GenerateMipMaps(renderContext)
  {
    if (!HasFlag(this.m_gpuUsage, Tr2GpuUsage.RENDER_TARGET) || !HasFlag(this.m_gpuUsage, Tr2GpuUsage.SHADER_RESOURCE))
    {
      return ALResult.E_INVALIDCALL;
    }

    const al = RenderContextALOf(renderContext);

    al.GetWorkQueue().GenerateMipMaps(this.m_texture, al.GetMipGenerator());

    return ALResult.S_OK;
  }

  /**
   * Resolves into `destination`. With one sample every Carbon backend falls
   * back to a plain copy (`Tr2TextureALMetal.mm:807-812`,
   * `Tr2TextureALDx11.cpp:1183-1186`); this backend has no multisampled
   * textures, so the multisample arm fails.
   *
   * @param {CjsWebgpuTextureAL} destination The texture to resolve into.
   * @param {object} renderContext The context whose work queue records it.
   * @returns {number} An `ALResult` value.
   */
  Resolve(destination, renderContext)
  {
    if ((this.m_msaa?.samples ?? 1) <= 1)
    {
      return destination.CopySubresourceRegion(new Tr2TextureSubresource(), this, new Tr2TextureSubresource(), renderContext);
    }

    return ALResult.E_FAIL;
  }

  /** The native shared handle, which WebGPU does not expose. */
  GetSharedHandle()
  {
    return null;
  }

  /** The descriptor-heap slot, which only the D3D12 backend has. */
  GetSrvIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /** The descriptor-heap slot, which only the D3D12 backend has. */
  GetUavIndexInHeap()
  {
    return NO_HEAP_INDEX;
  }

  /** Releases the `GPUTexture` and its views, leaving the AL invalid. */
  Destroy()
  {
    this.m_texture?.destroy?.();
    this.m_texture = null;
    this.m_views = new Map();
    this._mappedData = null;
    this._mappedRegion = null;
    this.m_desc = null;
    this.m_format = null;
    this.m_srgbFormat = null;
    this.m_webgpu = null;
    this.m_gpuUsage = Tr2GpuUsage.NONE;
    this.m_cpuUsage = Tr2CpuUsage.NONE;
  }

  /** Where the texture lives, which for this backend is always video memory. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }

  /**
   * Fills in what this AL knows for a memory report.
   *
   * @param {object} description The description to fill in.
   * @returns {object} The same description.
   */
  Describe(description)
  {
    if (!description) return description;

    description.memoryClass = this.GetMemoryClass();

    return description;
  }

  /**
   * Names the texture, which reaches the `GPUTexture` label for debugging.
   *
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this.m_name = String(name ?? "");

    if (this.m_texture) this.m_texture.label = this.m_name;

    return ALResult.S_OK;
  }

  /** The name given by `SetName`. */
  GetName()
  {
    return this.m_name;
  }
}

// DECLARED AS A CALL, NOT A DECORATOR, for the reason recorded in
// Tr2BitmapDimensions.js: the layer is imported straight from source by its
// tests and raw Node cannot parse decorator syntax.
//
// The donor is NAMED rather than left to be derived from this class's name.
// Carbon calls every backend's class the same thing and carries the backend in
// the FILE name, because only one backend compiles at a time; we ship them
// together, so the backend moves onto the class name. That divergence is the
// author's to declare, never a checker's to guess.
CjsSchema.define(CjsWebgpuTextureAL, { className: "CjsWebgpuTextureAL", carbon: "Tr2TextureAL" });
