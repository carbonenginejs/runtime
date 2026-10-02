// Source: trinity/trinityal/include/Tr2TextureAL.h
// Source: trinity/trinityal/src/Tr2TextureAL.cpp
import { CjsSchema, meta } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { BitmapDimensions } from "#imageio";
import { Tr2MsaaDesc, Tr2TextureSubresource } from "../Tr2HalHelperStructures/index.js";
import { PixelFormat } from "#consts/render-context";

const emptyDescription = new BitmapDimensions();
const emptyMsaa = new Tr2MsaaDesc();

/** An explicitly owned texture value sharing one backend implementation. */
export class Tr2TextureAL
{
  /** Native shared_ptr control block; null represents the uncreated value. */
  _texture = null;

  /** Explicit copy construction replaces C++ implicit value copies. Plain JS assignment aliases. */
  constructor({ copy = null } = {})
  {
    this._texture = copy ? copy._texture : null;
    if (this._texture) this._texture.owners += 1;
  }

  /** Creates a fresh implementation, preserving existing copies. Context allocation replaces compile-time backend selection. */
  @meta.blue.method
  @meta.adapted
  Create(description, options, renderContext)
  {
    description = Object.assign(new BitmapDimensions(), description);
    this.Destroy();
    const { result, implementation } = RenderContextALOf(renderContext).CreateTexture(description, options, true);
    if (!Failed(result)) this._texture = { implementation, owners: 1 };
    return result;
  }

  /** Shared external textures are unsupported by the current JS backends; failure resets this value. */
  @meta.blue.method
  @meta.notSupported
  OpenShared(_handle, _gpuUsage, _renderContext)
  {
    this.Destroy();
    return ALResult.E_FAIL;
  }

  /** Ours: optional asynchronous video colour reduction; null selects the browser fallback. */
  @meta.ours
  RequestAverageColor()
  {
    const implementation = this._texture ? this._texture.implementation : null;
    return implementation && typeof implementation.RequestAverageColor === "function"
      ? implementation.RequestAverageColor() : null;
  }

  /** Reports whether this value references valid backend storage. */
  @meta.blue.method
  @meta.implemented
  IsValid()
  {
    return this._texture !== null && this._texture.implementation.IsValid();
  }

  /** Returns the backend memory class, or managed for an uncreated value. */
  @meta.blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._texture ? this._texture.implementation.GetMemoryClass() : Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /** Returns the native description, including its empty-value defaults. */
  @meta.blue.method
  @meta.implemented
  GetDesc()
  {
    return this._texture ? this._texture.implementation.GetDesc() : emptyDescription;
  }

  /** Returns the native multisample description. */
  @meta.blue.method
  @meta.implemented
  GetMsaaDesc()
  {
    return this._texture ? this._texture.implementation.GetMsaaDesc() : emptyMsaa;
  }

  /** Returns the native usage flags. */
  @meta.blue.method
  @meta.implemented
  GetGpuUsage()
  {
    return this._texture ? this._texture.implementation.GetGpuUsage() : 0;
  }

  /** Returns the native usage flags. */
  @meta.blue.method
  @meta.implemented
  GetCpuUsage()
  {
    return this._texture ? this._texture.implementation.GetCpuUsage() : 0;
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetWidth()
  {
    return this.GetDesc().GetWidth();
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetHeight()
  {
    return this.GetDesc().GetHeight();
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetDepth()
  {
    return this.GetDesc().GetDepth();
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetMipCount()
  {
    return this.GetDesc().GetMipCount();
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetTrueMipCount()
  {
    return this.GetDesc().GetTrueMipCount();
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetFormat()
  {
    return this.GetDesc().GetFormat();
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetType()
  {
    return this.GetDesc().GetType();
  }

  /** Returns the corresponding native texture dimension. */
  @meta.blue.method
  @meta.implemented
  GetArraySize()
  {
    return this.GetDesc().GetArraySize();
  }

  /** Returns the byte size of a mip level. */
  @meta.blue.method
  @meta.implemented
  GetMipSize(mip)
  {
    return this.GetDesc().GetMipSize(mip);
  }

  /** Compares shared implementation identity; JavaScript has no overloadable equality operator. */
  @meta.blue.method
  @meta.adapted
  Equals(other)
  {
    return this._texture === other._texture;
  }

  /** Forwards MapForReading to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  MapForReading(region, synchronize, renderContext)
  {
    if (arguments.length === 2)
    {
      renderContext = synchronize;
      synchronize = true;
    }
    return this._texture ? this._texture.implementation.MapForReading(region, synchronize, renderContext) : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
  }

  /** Forwards UnmapForReading to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  UnmapForReading(renderContext)
  {
    return this._texture ? this._texture.implementation.UnmapForReading(renderContext) : undefined;
  }

  /** Forwards MapForWriting to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  MapForWriting(region, renderContext)
  {
    return this._texture ? this._texture.implementation.MapForWriting(region, renderContext) : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
  }

  /** Forwards UnmapForWriting to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  UnmapForWriting(renderContext)
  {
    return this._texture ? this._texture.implementation.UnmapForWriting(renderContext) : undefined;
  }

  /** Forwards UpdateSubresource to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  UpdateSubresource(region, source, pitch, slicePitch, renderContext)
  {
    return this._texture ? this._texture.implementation.UpdateSubresource(region, source, pitch, slicePitch, renderContext) : ALResult.E_INVALIDCALL;
  }

  /** Forwards CopySubresourceRegion to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  CopySubresourceRegion(destinationRegion, source, sourceRegion, renderContext)
  {
    if (!this.IsValid() || !RenderContextALOf(renderContext).IsValid()) return ALResult.E_INVALIDCALL;
    if (!source.IsValid()) return ALResult.E_INVALIDARG;
    return this._texture.implementation.CopySubresourceRegion(destinationRegion, source.TrinityALImpl_GetObject(), sourceRegion, renderContext);
  }

  /** Forwards Resolve to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  Resolve(destination, renderContext)
  {
    if (this.GetMsaaDesc().samples <= 1)
    {
      return destination.CopySubresourceRegion(new Tr2TextureSubresource(), this, new Tr2TextureSubresource(), renderContext);
    }
    if (!this.IsValid() || !RenderContextALOf(renderContext).IsValid()) return ALResult.E_INVALIDCALL;
    if (!destination.IsValid()) return ALResult.E_INVALIDARG;
    return this._texture.implementation.Resolve(destination.TrinityALImpl_GetObject(), renderContext);
  }

  /** Forwards GetSharedHandle to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  GetSharedHandle()
  {
    return this._texture ? this._texture.implementation.GetSharedHandle() : 0;
  }

  /** Forwards GetSrvIndexInHeap to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  GetSrvIndexInHeap(colorSpace = 0)
  {
    return this._texture ? this._texture.implementation.GetSrvIndexInHeap(colorSpace) : 0xffffffff;
  }

  /** Forwards GetUavIndexInHeap to the implementation, preserving the empty-value result. */
  @meta.blue.method
  @meta.implemented
  GetUavIndexInHeap(mip)
  {
    return this._texture ? this._texture.implementation.GetUavIndexInHeap(mip) : 0xffffffff;
  }

  /** Generates mips with Carbon’s validity, mip-count and BGR-format gates. */
  @meta.blue.method
  @meta.implemented
  GenerateMipMaps(renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (this.GetTrueMipCount() <= 1) return ALResult.S_OK;
    if ([ PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB, PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB ].includes(this.GetFormat())) return ALResult.E_INVALIDCALL;
    return this._texture.implementation.GenerateMipMaps(renderContext);
  }

  /** Names valid storage; invalid values and absent names retain Carbon’s errors. */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._texture.implementation.SetName(name);
  }

  /** Returns the backend name for valid storage. */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.IsValid() ? this._texture.implementation.GetName() : null;
  }

  /** Returns the borrowed backend implementation for backend-only operations. */
  @meta.blue.method
  @meta.implemented
  TrinityALImpl_GetObject()
  {
    return this._texture ? this._texture.implementation : null;
  }

  /** Releases this value explicitly because JavaScript has no deterministic scope destructor. Copies remain valid until their own final release. */
  @meta.ours
  Destroy()
  {
    const owned = this._texture;
    this._texture = null;
    if (owned && --owned.owners === 0) owned.implementation.Destroy();
  }
}

CjsSchema.define(Tr2TextureAL, { className: "Tr2TextureAL", carbon: "Tr2TextureAL" });
