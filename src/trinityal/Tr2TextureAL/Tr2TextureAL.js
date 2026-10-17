// Source: trinity/trinityal/include/Tr2TextureAL.h
// Source: trinity/trinityal/src/Tr2TextureAL.cpp
import { CjsSchema, meta, blue, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult, Failed } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { BitmapDimensions } from "#imageio";
import { Tr2MsaaDesc, Tr2TextureSubresource } from "../Tr2HalHelperStructures/index.js";
import { PixelFormat, Tr2CpuUsage } from "#consts/render-context";
import { Tr2ReadbackAL } from "../Tr2ReadbackAL/Tr2ReadbackAL.js";

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

  /**
   * Carbon's Create( desc, gpuUsage, renderContext ) (Tr2TextureAL.h:50): the
   * full overload with an empty multisample description, no CPU usage and no
   * initial data (Tr2TextureAL.cpp:63-66).
   *
   * @param {BitmapDimensions} desc The texture description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Create__GpuUsage(desc, gpuUsage, renderContext)
  {
    return this.Create(desc, new Tr2MsaaDesc(), gpuUsage, Tr2CpuUsage.NONE, null, renderContext);
  }

  /**
   * Carbon's Create( desc, msaa, gpuUsage, renderContext ) (Tr2TextureAL.h:51):
   * the full overload with no CPU usage and no initial data
   * (Tr2TextureAL.cpp:68-71).
   *
   * @param {BitmapDimensions} desc The texture description.
   * @param {Tr2MsaaDesc} msaa The multisample description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Create__MsaaGpuUsage(desc, msaa, gpuUsage, renderContext)
  {
    return this.Create(desc, msaa, gpuUsage, Tr2CpuUsage.NONE, null, renderContext);
  }

  /**
   * Carbon's Create( desc, gpuUsage, initialData, renderContext )
   * (Tr2TextureAL.h:52): the full overload with an empty multisample
   * description and no CPU usage (Tr2TextureAL.cpp:73-76).
   *
   * @param {BitmapDimensions} desc The texture description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {Tr2SubresourceData[]|null} initialData Initial subresource data, indexed `mip + layer * mipCount`.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Create__GpuUsageInitialData(desc, gpuUsage, initialData, renderContext)
  {
    return this.Create(desc, new Tr2MsaaDesc(), gpuUsage, Tr2CpuUsage.NONE, initialData, renderContext);
  }

  /**
   * Carbon's Create( desc, gpuUsage, cpuUsage, renderContext )
   * (Tr2TextureAL.h:53): the full overload with an empty multisample
   * description and no initial data (Tr2TextureAL.cpp:78-81).
   *
   * @param {BitmapDimensions} desc The texture description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Create__GpuUsageCpuUsage(desc, gpuUsage, cpuUsage, renderContext)
  {
    return this.Create(desc, new Tr2MsaaDesc(), gpuUsage, cpuUsage, null, renderContext);
  }

  /**
   * Carbon's Create( desc, gpuUsage, cpuUsage, initialData, renderContext )
   * (Tr2TextureAL.h:54): the full overload with an empty multisample
   * description (Tr2TextureAL.cpp:83-86).
   *
   * @param {BitmapDimensions} desc The texture description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @param {Tr2SubresourceData[]|null} initialData Initial subresource data, indexed `mip + layer * mipCount`.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Create__GpuUsageCpuUsageInitialData(desc, gpuUsage, cpuUsage, initialData, renderContext)
  {
    return this.Create(desc, new Tr2MsaaDesc(), gpuUsage, cpuUsage, initialData, renderContext);
  }

  /**
   * Carbon's full Create( desc, msaa, gpuUsage, cpuUsage, initialData,
   * renderContext ) (Tr2TextureAL.h:55, Tr2TextureAL.cpp:88-97), which the
   * other five overloads forward to. Creates a fresh implementation and leaves
   * this value empty when the backend refuses.
   *
   * Adapted: the render context allocates the backend implementation instead
   * of a compile-time platform include, and this value's previous share is
   * released explicitly because JavaScript has no shared_ptr; existing copies
   * keep the old implementation alive.
   *
   * @param {BitmapDimensions} desc The texture description.
   * @param {Tr2MsaaDesc} msaa The multisample description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {number} cpuUsage A `Tr2CpuUsage` bit set.
   * @param {Tr2SubresourceData[]|null} initialData Initial subresource data, indexed `mip + layer * mipCount`, or null.
   * @param {object} renderContext The context to create against.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.adapted
  Create(desc, msaa, gpuUsage, cpuUsage, initialData, renderContext)
  {
    desc = Object.assign(new BitmapDimensions(), desc);
    this.Destroy();
    const { result, implementation } = RenderContextALOf(renderContext).CreateTexture(desc, { msaa, gpuUsage, cpuUsage, initialData }, true);
    if (!Failed(result)) this._texture = { implementation, owners: 1 };
    return result;
  }

  /** Shared external textures are unsupported by the current JS backends; failure resets this value. */
  @blue.method
  @meta.notSupported
  OpenShared(_handle, _gpuUsage, _renderContext)
  {
    this.Destroy();
    return ALResult.E_FAIL;
  }

  /** Ours: optional asynchronous video colour reduction; null selects the browser fallback. */
  RequestAverageColor()
  {
    const implementation = this._texture ? this._texture.implementation : null;
    return implementation && typeof implementation.RequestAverageColor === "function"
      ? implementation.RequestAverageColor() : null;
  }

  /** Reports whether this value references valid backend storage. */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._texture !== null && this._texture.implementation.IsValid();
  }

  /** Returns the backend memory class, or managed for an uncreated value. */
  @blue.method
  @meta.implemented
  GetMemoryClass()
  {
    return this._texture ? this._texture.implementation.GetMemoryClass() : Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /** Returns the native description, including its empty-value defaults. */
  @blue.method
  @meta.implemented
  GetDesc()
  {
    return this._texture ? this._texture.implementation.GetDesc() : emptyDescription;
  }

  /** Returns the native multisample description. */
  @blue.method
  @meta.implemented
  GetMsaaDesc()
  {
    return this._texture ? this._texture.implementation.GetMsaaDesc() : emptyMsaa;
  }

  /** Returns the native usage flags. */
  @blue.method
  @meta.implemented
  GetGpuUsage()
  {
    return this._texture ? this._texture.implementation.GetGpuUsage() : 0;
  }

  /** Returns the native usage flags. */
  @blue.method
  @meta.implemented
  GetCpuUsage()
  {
    return this._texture ? this._texture.implementation.GetCpuUsage() : 0;
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetWidth()
  {
    return this.GetDesc().GetWidth();
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetHeight()
  {
    return this.GetDesc().GetHeight();
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetDepth()
  {
    return this.GetDesc().GetDepth();
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetMipCount()
  {
    return this.GetDesc().GetMipCount();
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetTrueMipCount()
  {
    return this.GetDesc().GetTrueMipCount();
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetFormat()
  {
    return this.GetDesc().GetFormat();
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetType()
  {
    return this.GetDesc().GetType();
  }

  /** Returns the corresponding native texture dimension. */
  @blue.method
  @meta.implemented
  GetArraySize()
  {
    return this.GetDesc().GetArraySize();
  }

  /** Returns the byte size of a mip level. */
  @blue.method
  @meta.implemented
  GetMipSize(mip)
  {
    return this.GetDesc().GetMipSize(mip);
  }

  /** Compares shared implementation identity; JavaScript has no overloadable equality operator. */
  @blue.method
  @meta.adapted
  Equals(other)
  {
    return this._texture === other._texture;
  }

  /** Creates an independently owned snapshot, retaining native empty-value semantics. */
  @meta.adapted
  CreateReadback(region, renderContext)
  {
    return new Tr2ReadbackAL({ implementation: this._texture
      ? this._texture.implementation.CreateReadback(region, renderContext) : null });
  }

  /** Forwards the current native mapping signature and preserves the empty-value result. */
  @blue.method
  @meta.implemented
  MapForReading(region, renderContext)
  {
    return this._texture ? this._texture.implementation.MapForReading(region, renderContext) : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
  }

  /** Forwards UnmapForReading to the implementation, preserving the empty-value result. */
  @blue.method
  @meta.implemented
  UnmapForReading(renderContext)
  {
    return this._texture ? this._texture.implementation.UnmapForReading(renderContext) : undefined;
  }

  /** Forwards MapForWriting to the implementation, preserving the empty-value result. */
  @blue.method
  @meta.implemented
  MapForWriting(region, renderContext)
  {
    return this._texture ? this._texture.implementation.MapForWriting(region, renderContext) : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
  }

  /** Forwards UnmapForWriting to the implementation, preserving the empty-value result. */
  @blue.method
  @meta.implemented
  UnmapForWriting(renderContext)
  {
    return this._texture ? this._texture.implementation.UnmapForWriting(renderContext) : undefined;
  }

  /** Forwards UpdateSubresource to the implementation, preserving the empty-value result. */
  @blue.method
  @meta.implemented
  UpdateSubresource(region, source, pitch, slicePitch, renderContext)
  {
    return this._texture ? this._texture.implementation.UpdateSubresource(region, source, pitch, slicePitch, renderContext) : ALResult.E_INVALIDCALL;
  }

  /** Forwards CopySubresourceRegion to the implementation, preserving the empty-value result. */
  @blue.method
  @meta.implemented
  CopySubresourceRegion(destinationRegion, source, sourceRegion, renderContext)
  {
    if (!this.IsValid() || !RenderContextALOf(renderContext).IsValid()) return ALResult.E_INVALIDCALL;
    if (!source.IsValid()) return ALResult.E_INVALIDARG;
    return this._texture.implementation.CopySubresourceRegion(destinationRegion, source.TrinityALImpl_GetObject(), sourceRegion, renderContext);
  }

  /** Forwards Resolve to the implementation, preserving the empty-value result. */
  @blue.method
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
  @blue.method
  @meta.implemented
  GetSharedHandle()
  {
    return this._texture ? this._texture.implementation.GetSharedHandle() : 0;
  }

  /** Forwards GetSrvIndexInHeap to the implementation, preserving the empty-value result. */
  @blue.method
  @meta.implemented
  GetSrvIndexInHeap(colorSpace = 0)
  {
    return this._texture ? this._texture.implementation.GetSrvIndexInHeap(colorSpace) : 0xffffffff;
  }

  /** Forwards GetUavIndexInHeap to the implementation, preserving the empty-value result. */
  @blue.method
  @meta.implemented
  GetUavIndexInHeap(mip)
  {
    return this._texture ? this._texture.implementation.GetUavIndexInHeap(mip) : 0xffffffff;
  }

  /** Generates mips with Carbon’s validity, mip-count and BGR-format gates. */
  @blue.method
  @meta.implemented
  GenerateMipMaps(renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (this.GetTrueMipCount() <= 1) return ALResult.S_OK;
    if ([ PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB, PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM_SRGB ].includes(this.GetFormat())) return ALResult.E_INVALIDCALL;
    return this._texture.implementation.GenerateMipMaps(renderContext);
  }

  /** Names valid storage; invalid values and absent names retain Carbon’s errors. */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;
    if (name === null || name === undefined) return ALResult.E_INVALIDARG;
    return this._texture.implementation.SetName(name);
  }

  /** Returns the backend name for valid storage. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.IsValid() ? this._texture.implementation.GetName() : null;
  }

  /** Returns the borrowed backend implementation for backend-only operations. */
  @blue.method
  @meta.implemented
  TrinityALImpl_GetObject()
  {
    return this._texture ? this._texture.implementation : null;
  }

  /** Releases this value explicitly because JavaScript has no deterministic scope destructor. Copies remain valid until their own final release. */
  Destroy()
  {
    const owned = this._texture;
    this._texture = null;
    if (owned && --owned.owners === 0) owned.implementation.Destroy();
  }
}



CjsSchema.decorateField(Tr2TextureAL, "_texture", type.unknown);
CjsSchema.decorateMethod(Tr2TextureAL, "Equals", meta.renamed("operator=="));
CjsSchema.decorateMethod(Tr2TextureAL, "CreateReadback", blue.method);
CjsSchema.blue.define(Tr2TextureAL, { className: "Tr2TextureAL" });
