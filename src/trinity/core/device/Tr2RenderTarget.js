// Source: trinity/trinity/Tr2RenderTarget.h
// Source: trinity/trinity/Tr2RenderTarget.cpp
import { Tr2TextureAL } from "../../../trinityal/Tr2TextureAL/index.js";
//
// "A class to hang on to platform specific pointers needed for a renderTarget"
// - Carbon's description. It owns one Tr2TextureAL (or references an attached
// one, such as a swap-chain back buffer) and the parameters it was created
// with; everything else reads the texture.
//
// THE RENDER CONTEXT. Carbon reaches the main-thread context through
// USE_MAIN_THREAD_RENDER_CONTEXT(); ours is Tr2RenderContext_GetMainThreadRenderContext(),
// the default here. Each verb also takes an optional trailing context, for a
// caller composing its own.
//
// The `@edit.read` properties are the Blue READ projection, refreshed wherever
// the texture changes.
import { meta, type, blue } from "#schema";
import { Tr2Event } from "../Tr2Event.js";
import { ExFlag, PixelFormat, TextureType, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { ALResult } from "#trinityal";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { Tr2MsaaDesc } from "../../../trinityal/Tr2HalHelperStructures/Tr2MsaaDesc.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import "#consts/renderContext/formats";

/**
 * Carbon's anonymous `GetUsage` (`cpp:11-27`): a render target is always a
 * render target and a shader resource, readable unless multisampled, and
 * unordered-access or shared on request.
 */
function GetUsage(msaaType, flags)
{
  let gpuUsage = Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE;
  let cpuUsage = Tr2CpuUsage.READ;

  if (msaaType > 1)
  {
    cpuUsage = Tr2CpuUsage.NONE;
  }
  else if ((flags & ExFlag.EX_BIND_UNORDERED_ACCESS) !== 0)
  {
    gpuUsage |= Tr2GpuUsage.UNORDERED_ACCESS;
  }
  if ((flags & ExFlag.EX_CREATE_SHARED) !== 0)
  {
    gpuUsage |= Tr2GpuUsage.SHARED;
  }
  return { gpuUsage, cpuUsage };
}

/** Holds a render-target texture and the parameters it was created with. */
@blue.define("Tr2RenderTarget")
export class Tr2RenderTarget
{

  /** m_name (std::string) [PERSISTONLY] */
  @blue.readwrite
  @blue.persistOnly
  @type.string
  name = "";

  @blue.read
  @type.uint32
  width = 0;

  @blue.read
  @type.uint32
  height = 0;

  @blue.read
  @type.uint32
  arraySize = 0;

  @blue.read
  @type.uint32
  mipCount = 0;

  @blue.read
  @type.uint32
  multiSampleType = 0;

  @blue.read
  @type.uint32
  multiSampleQuality = 0;

  @blue.read
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  format = 0;

  @blue.read
  @type.int32
  @type.enum("trinity.ImageIO.TextureType")
  type = 6;

  @blue.read
  @type.boolean
  isValid = false;

  @blue.read
  @type.boolean
  isReadable = false;

  /** m_renderTarget (Tr2TextureAL), owned. */
  _renderTarget = null;

  /** m_attachedRenderTarget (Tr2TextureAL), referenced while attached. */
  _attachedRenderTarget = null;

  /** m_attachedOwner, whose presence is what "attached" means. */
  _attachedOwner = null;

  /** The creation parameters, kept so OnPrepareResources can rebuild. */
  _created = null;

  /** m_onTextureChange (OnTextureChangeEvent) */
  _onTextureChange = new Tr2Event();

  /**
   * Carbon `py__init__` (`cpp:59-74`): creates when given a size and a format.
   */
  @blue.method
  @meta.implemented
  __init__(width = 0, height = 0, mipCount = 1, format = PixelFormat.PIXEL_FORMAT_UNKNOWN, msaaType = 1, msaaQuality = 0, flags = ExFlag.EX_NONE, type = TextureType.TEX_TYPE_2D)
  {
    if (width && height && format)
    {
      this.Create(width, height, mipCount, format, msaaType, msaaQuality, flags, type);
    }
  }

  /**
   * Carbon `Create` (`cpp:76-128`): a single render target, 2D by default.
   *
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Create(width, height, mipLevelCount, format, msaaType = 1, msaaQuality = 0, flags = ExFlag.EX_NONE, type = TextureType.TEX_TYPE_2D, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this.IsAttached()) return ALResult.E_INVALIDARG;

    const { gpuUsage, cpuUsage } = GetUsage(msaaType, flags);
    const textureType = type || TextureType.TEX_TYPE_2D;
    const dimensions = new Tr2BitmapDimensions({ type: textureType, format, width, height, depth: 1, mipCount: mipLevelCount });

    return this._Create(dimensions, new Tr2MsaaDesc(msaaType, msaaQuality), gpuUsage, cpuUsage, renderContext, false);
  }

  /**
   * Carbon `CreateArray` (`cpp:130-186`): an array of render targets; a cube
   * array counts six faces per element.
   *
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  CreateArray(width, height, arraySize, mipLevelCount, format, flags = ExFlag.EX_NONE, type = TextureType.TEX_TYPE_2D, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this.IsAttached()) return ALResult.E_INVALIDARG;

    const { gpuUsage, cpuUsage } = GetUsage(0, flags);
    const textureType = type || TextureType.TEX_TYPE_2D;
    const slices = textureType === TextureType.TEX_TYPE_CUBE ? arraySize * 6 : arraySize;
    const dimensions = new Tr2BitmapDimensions({ type: textureType, format, width, height, depth: 1, mipCount: mipLevelCount, arraySize: slices });

    return this._Create(dimensions, new Tr2MsaaDesc(), gpuUsage, cpuUsage, renderContext, false);
  }

  /**
   * Carbon `CreateManual` (`cpp:188-235`): the caller names the CPU and GPU
   * usage outright. Unlike the other two, it raises the texture-change event.
   *
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  CreateManual(width, height, mipLevelCount, format, msaaType, msaaQuality, flags, type, cpuUsage, gpuUsage, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this.IsAttached()) return ALResult.E_INVALIDARG;

    const dimensions = new Tr2BitmapDimensions({ type, format, width, height, depth: 1, mipCount: mipLevelCount });

    return this._Create(dimensions, new Tr2MsaaDesc(msaaType, msaaQuality), gpuUsage, cpuUsage, renderContext, true);
  }

  /**
   * The shared body of the three Create verbs: create the texture through the
   * context, or destroy on failure (Carbon's `else Destroy()`).
   */
  _Create(dimensions, msaa, gpuUsage, cpuUsage, renderContext, raiseChange)
  {
    const texture = renderContext.CreateTexture(dimensions, { gpuUsage, cpuUsage, msaa });

    if (!texture)
    {
      this.Destroy();
      return ALResult.E_FAIL;
    }

    if (this._renderTarget) this._renderTarget.Destroy();
    this._renderTarget = texture;
    this._created = { dimensions, msaa, gpuUsage, cpuUsage };
    texture.SetName(this.name);
    this._Refresh();
    if (raiseChange) this._Changed();
    return ALResult.S_OK;
  }

  /**
   * Carbon `GetTexture` (`cpp:237-245`): the texture, only when it can be
   * sampled.
   */
  @blue.method
  @meta.implemented
  GetTexture()
  {
    const texture = this.GetRenderTarget();
    return texture?.IsValid() && (texture.GetGpuUsage() & Tr2GpuUsage.SHADER_RESOURCE) !== 0 ? texture : null;
  }

  /**
   * Carbon OnTextureChange (ITr2TextureProvider.h:16): the event fired when the render target's
   * texture changes. Listeners register an owner and an unbound method; the
   * event holds owners weakly.
   *
   * @returns {Tr2Event} m_onTextureChange.
   */
  @blue.method
  @meta.implemented
  OnTextureChange()
  {
    return this._onTextureChange;
  }

  /**
   * Carbon `Attach` (`cpp:262-271`): reference an AL render target someone
   * else owns, such as a swap-chain back buffer.
   */
  @blue.method
  @meta.implemented
  Attach(renderTarget, owner)
  {
    const next = renderTarget ? new Tr2TextureAL({ copy: renderTarget }) : null;
    this.Destroy();
    if (this._attachedRenderTarget) this._attachedRenderTarget.Destroy();
    this._attachedRenderTarget = next;
    this._attachedOwner = owner ?? null;
    this._Refresh();
    this._Changed();
  }

  /** Carbon `Detach` (`cpp:277-285`). */
  @blue.method
  @meta.implemented
  Detach()
  {
    if (this._attachedOwner)
    {
      this._attachedOwner = null;
      this._Refresh();
      this._Changed();
    }
    this._attachedOwner = null;
  }

  /** Carbon `IsAttached` (`cpp:294-297`). */
  @blue.method
  @meta.implemented
  IsAttached()
  {
    return this._attachedOwner !== null;
  }

  /**
   * Carbon `GetRenderTarget` (`cpp:305-312`): the attached texture while
   * attached, else the owned one.
   *
   * @returns {object|null} The `Tr2TextureAL`.
   */
  @blue.method
  @meta.implemented
  GetRenderTarget()
  {
    return this.IsAttached() ? this._attachedRenderTarget : this._renderTarget;
  }

  /** Carbon `IsValid` (`cpp:328-331`). */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return Boolean(this.GetRenderTarget()?.IsValid());
  }

  /** Carbon `Destroy` (`cpp:333-352`): releases the owned texture and resets. */
  @blue.method
  @meta.implemented
  Destroy()
  {
    const wasValid = Boolean(this._renderTarget?.IsValid());

    if (this._renderTarget) this._renderTarget.Destroy();
    this._renderTarget = null;
    this._created = null;
    this._Refresh();

    if (wasValid) this._Changed();
  }

  /**
   * Final owner teardown, including the attached value retained by native Detach/Destroy.
   * Adapted: JavaScript requires an explicit counterpart to the C++ member destructors.
   * Call after the owner has stopped using this render target.
   */
  @meta.ours
  Dispose()
  {
    this.Destroy();
    if (this._attachedRenderTarget) this._attachedRenderTarget.Destroy();
    this._attachedRenderTarget = null;
    this._attachedOwner = null;
    this._Refresh();
  }

  /** Carbon `IsReadable` (`cpp:354-357`). */
  @blue.method
  @meta.implemented
  IsReadable()
  {
    const texture = this.GetRenderTarget();
    return Boolean(texture?.IsValid()) && (texture.GetGpuUsage() & Tr2GpuUsage.SHADER_RESOURCE) !== 0;
  }

  /**
   * Carbon `GenerateMipMaps` (`cpp:359-364`).
   *
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  GenerateMipMaps(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    return this.GetRenderTarget().GenerateMipMaps(renderContext);
  }

  /**
   * Carbon `Resolve` (`cpp:366-375`).
   *
   * @param {Tr2RenderTarget} destination The render target to resolve into.
   * @returns {number} An `ALResult` value.
   */
  @blue.method
  @meta.implemented
  Resolve(destination, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (!destination) return ALResult.E_FAIL;
    return this.GetRenderTarget().Resolve(destination.GetRenderTarget(), renderContext);
  }

  /** Carbon Tr2RenderTarget::HasALObject always reports false (cpp:389-392). */
  @blue.method
  @meta.implemented
  HasALObject(_type, _object)
  {
    return false;
  }

  /** Carbon `GetSharedHandle` (`cpp:400-403`), exposed as `sharedHandle`. */
  @blue.method
  @meta.implemented
  sharedHandle()
  {
    return this._renderTarget?.GetSharedHandle() ?? null;
  }

  /** Carbon `GetWidth` (`cpp:411-414`). */
  @blue.method
  @meta.implemented
  GetWidth()
  {
    return this.GetRenderTarget()?.GetWidth() ?? 0;
  }

  /** Carbon `GetHeight` (`cpp:422-425`). */
  @blue.method
  @meta.implemented
  GetHeight()
  {
    return this.GetRenderTarget()?.GetHeight() ?? 0;
  }

  /** Carbon `GetMipCount` (`cpp:433-436`). */
  @blue.method
  @meta.implemented
  GetMipCount()
  {
    return this.GetRenderTarget()?.GetMipCount() ?? 0;
  }

  /** Carbon `GetArraySize` (`cpp:444-447`). */
  @blue.method
  @meta.implemented
  GetArraySize()
  {
    return this.GetRenderTarget()?.GetArraySize() ?? 0;
  }

  /** Carbon `GetMsaaType` (`cpp:455-458`). */
  @blue.method
  @meta.implemented
  GetMsaaType()
  {
    return this.GetRenderTarget()?.GetMsaaDesc().samples ?? 0;
  }

  /** Carbon `GetMsaaQuality` (`cpp:466-469`). */
  @blue.method
  @meta.implemented
  GetMsaaQuality()
  {
    return this.GetRenderTarget()?.GetMsaaDesc().quality ?? 0;
  }

  /** Carbon `GetFormat` (`cpp:477-480`). */
  @blue.method
  @meta.implemented
  GetFormat()
  {
    return this.GetRenderTarget()?.GetFormat() ?? PixelFormat.PIXEL_FORMAT_UNKNOWN;
  }

  /** Carbon `GetType` (`cpp:482-485`). */
  @blue.method
  @meta.implemented
  GetType()
  {
    return this.GetRenderTarget()?.GetType() ?? TextureType.TEX_TYPE_INVALID;
  }

  /** Carbon `SetName` (`cpp:44-48`), which names the texture too. */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = name ?? "";
    this._renderTarget?.SetName(this.name);
  }

  /** Carbon `GetName` (`cpp:50-53`). */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Carbon `ReleaseResources` (`cpp:488-495`): drop the owned texture when its
   * memory class is being released.
   */
  @blue.method
  @meta.implemented
  ReleaseResources(storage)
  {
    if (this._renderTarget?.IsValid() && (this._renderTarget.GetMemoryClass() & storage))
    {
      if (this._renderTarget) this._renderTarget.Destroy();
    this._renderTarget = null;
      this._Refresh();
      this._Changed();
    }
  }

  /**
   * Carbon `OnPrepareResources` (`cpp:498-508`): recreate a released texture
   * from the parameters it was made with.
   */
  @blue.method
  @meta.implemented
  OnPrepareResources(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (!this._renderTarget && this._created)
    {
      const { dimensions, msaa, gpuUsage, cpuUsage } = this._created;
      this._renderTarget = renderContext.CreateTexture(dimensions, { gpuUsage, cpuUsage, msaa });
      this._Refresh();
      this._Changed();
    }
    return true;
  }

  /** Republishes the Blue READ projection from the live texture. */
  _Refresh()
  {
    this.width = this.GetWidth();
    this.height = this.GetHeight();
    this.arraySize = this.GetArraySize();
    this.mipCount = this.GetMipCount();
    this.multiSampleType = this.GetMsaaType();
    this.multiSampleQuality = this.GetMsaaQuality();
    this.format = this.GetFormat();
    this.type = this.GetType();
    this.isValid = this.IsValid();
    this.isReadable = this.IsReadable();
  }

  /** Carbon's `m_onTextureChange()`. */
  _Changed()
  {
    this._onTextureChange.Broadcast();
  }

  static PixelFormat = PixelFormat;
  static TextureType = TextureType;
}
