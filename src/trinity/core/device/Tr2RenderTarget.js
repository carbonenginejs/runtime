import { exposure as be } from "#be";
import { IRoot } from "../../../blue/exposure/IRoot.js";
import { ITr2TextureProvider } from "../ITr2TextureProvider.js";
import { Tr2DeviceResource } from "./Tr2DeviceResource.js";
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
// the default here. Each Create verb also takes an optional trailing context, for a
// caller composing its own. Preparation after a release takes none, as in Carbon.
//
// DEVICE RESIDENCY. Creating, sampling or rendering into the target is a use and
// renews it (KeepAlive). An idle target is released by the device sweep and loses
// its pixels; the next use registers it again and the device tick recreates it.
//
// The `@be.mapAttribute(be.READ)` properties are the Blue READ projection, refreshed wherever
// the texture changes.
import { type } from "#schema";
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

/**
 * Holds a render-target texture and the parameters it was created with.
 * Carbon: Tr2RenderTarget (trinity/trinity/Tr2RenderTarget.h:18-20)
 */
@be.define("Tr2RenderTarget")
@be.inherit(ITr2TextureProvider, Tr2DeviceResource)
@be.mapInterface(ITr2TextureProvider)
export class Tr2RenderTarget extends IRoot
{

  /**
   * m_name (std::string) [PERSISTONLY]
   *
   * @implemented
   */
  @be.mapAttribute(be.PERSISTONLY, "name")
  @type.string
  _name = "";

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
   *
   * @implemented
   */
  @be.mapMethodAndWrapOptionalArgs(8)
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
   * Carbon exposes this function twice, as "Create" and, by mistake, as "CreateArray"; both lines are kept.
   *
   * @returns {number} An `ALResult` value.
   */
  // Carbon bug (CE-214): Tr2RenderTarget_Blue.cpp:49-51 binds CreateArray to Create.
  /** @implemented */
  @be.mapMethodAndWrapOptionalArgs(5, "CreateArray")
  @be.mapMethodAndWrapOptionalArgs(4)
  Create(width, height, mipLevelCount, format, msaaType = 1, msaaQuality = 0, flags = ExFlag.EX_NONE, type = TextureType.TEX_TYPE_2D, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this.IsAttached()) return ALResult.E_INVALIDARG;

    const { gpuUsage, cpuUsage } = GetUsage(msaaType, flags);
    const textureType = type || TextureType.TEX_TYPE_2D;
    const dimensions = Tr2BitmapDimensions.create__TypeFormatWidthHeightDepthMipCount(textureType, format, width, height, 1, mipLevelCount);

    return this._Create(dimensions, new Tr2MsaaDesc(msaaType, msaaQuality), gpuUsage, cpuUsage, renderContext, false);
  }

  /**
   * Carbon `CreateArray` (`cpp:130-186`): an array of render targets; a cube
   * array counts six faces per element.
   *
   * @implemented
   * @returns {number} An `ALResult` value.
   */
  CreateArray(width, height, arraySize, mipLevelCount, format, flags = ExFlag.EX_NONE, type = TextureType.TEX_TYPE_2D, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this.IsAttached()) return ALResult.E_INVALIDARG;

    const { gpuUsage, cpuUsage } = GetUsage(0, flags);
    const textureType = type || TextureType.TEX_TYPE_2D;
    const slices = textureType === TextureType.TEX_TYPE_CUBE ? arraySize * 6 : arraySize;
    const dimensions = Tr2BitmapDimensions.create__AllFields(textureType, format, width, height, 1, mipLevelCount, slices);

    return this._Create(dimensions, new Tr2MsaaDesc(), gpuUsage, cpuUsage, renderContext, false);
  }

  /**
   * Carbon `CreateManual` (`cpp:188-235`): the caller names the CPU and GPU
   * usage outright. Unlike the other two, it raises the texture-change event.
   *
   * @implemented
   * @returns {number} An `ALResult` value.
   * Carbon declaration: Tr2RenderTarget::CreateManual (trinity/trinity/Tr2RenderTarget.h:57).
   */
  CreateManual(width, height, mipLevelCount, format, msaaType, msaaQuality, flags, type, cpuUsage, gpuUsage, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (this.IsAttached()) return ALResult.E_INVALIDARG;

    const dimensions = Tr2BitmapDimensions.create__TypeFormatWidthHeightDepthMipCount(type, format, width, height, 1, mipLevelCount);

    return this._Create(dimensions, new Tr2MsaaDesc(msaaType, msaaQuality), gpuUsage, cpuUsage, renderContext, true);
  }

  /**
   * The shared body of the three Create verbs: create the texture through the
   * context, or destroy on failure (Carbon's `else Destroy()`).
   *
   * @cjs
   * @adapted Creation is the first use and registers with the device; Carbon registers in the constructor (Tr2DeviceResource.cpp:6-9).
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
    this.KeepAlive();
    texture.SetName(this._name);
    if (raiseChange) this._Changed();
    return ALResult.S_OK;
  }

  /**
   * Carbon `GetTexture` (`cpp:237-245`): the texture, only when it can be
   * sampled.
   *
   * @adapted Sampling renews device residency (through GetRenderTarget); Carbon keeps the texture until destruction.
   */

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
   * @implemented
   * @returns {Tr2Event} m_onTextureChange.
   */

  OnTextureChange()
  {
    return this._onTextureChange;
  }

  /**
   * Carbon `Attach` (`cpp:262-271`): reference an AL render target someone
   * else owns, such as a swap-chain back buffer.
   *
   * @implemented
   */

  Attach(renderTarget, owner)
  {
    const next = renderTarget ? new Tr2TextureAL({ copy: renderTarget }) : null;
    this.Destroy();
    if (this._attachedRenderTarget) this._attachedRenderTarget.Destroy();
    this._attachedRenderTarget = next;
    this._attachedOwner = owner ?? null;
    this._Changed();
  }

  /**
   * Carbon `Detach` (`cpp:277-285`).
   *
   * @implemented
   */

  Detach()
  {
    if (this._attachedOwner)
    {
      this._attachedOwner = null;
      this._Changed();
    }
    this._attachedOwner = null;
  }

  /**
   * Carbon `IsAttached` (`cpp:294-297`).
   *
   * @implemented
   */

  IsAttached()
  {
    return this._attachedOwner !== null;
  }

  /**
   * Carbon `GetRenderTarget` (`cpp:305-312`): the attached texture while
   * attached, else the owned one.
   *
   * @adapted Reading the surface renews device residency, so a target that is only rendered into stays alive too.
   *   It never creates storage: a getter may run with no GPU. A target the idle sweep released answers null
   *   until the device tick prepares it, and its reader skips the draw.
   * @returns {object|null} The `Tr2TextureAL`, or null before Create and between an idle release and the next prepare.
   */

  GetRenderTarget()
  {
    this.KeepAlive();
    return this.IsAttached() ? this._attachedRenderTarget : this._renderTarget;
  }

  /**
   * Carbon `IsValid` (`cpp:328-331`).
   *
   * @implemented
   */

  IsValid()
  {
    return Boolean(this.GetRenderTarget()?.IsValid());
  }

  /**
   * Carbon `Destroy` (`cpp:333-352`): releases the owned texture and resets.
   *
   * @implemented
   */

  Destroy()
  {
    const wasValid = Boolean(this._renderTarget?.IsValid());

    if (this._renderTarget) this._renderTarget.Destroy();
    this._renderTarget = null;
    this._created = null;

    if (wasValid) this._Changed();
  }

  /**
   * Final owner teardown. Call after the owner has stopped using this render target.
   *
   * @cjs
   * @adapted Forwards to Destruct, which runs _Destructor and the device-resource base's unregistration.
   */
  Dispose()
  {
    this.Destruct();
  }

  /**
   * Carbon: ~Tr2RenderTarget (trinity/trinity/Tr2RenderTarget.cpp:40-42).
   * @adapted The body is empty in Carbon; this releases the two Tr2TextureAL value members (h:114-115) their
   *   C++ destructors release, including the attached value native Detach/Destroy retain. Graph dispatch handles bases.
   */
  _Destructor()
  {
    this.Destroy();
    if (this._attachedRenderTarget) this._attachedRenderTarget.Destroy();
    this._attachedRenderTarget = null;
    this._attachedOwner = null;
  }

  /**
   * Carbon `IsReadable` (`cpp:354-357`).
   *
   * @implemented
   */

  IsReadable()
  {
    const texture = this.GetRenderTarget();
    return Boolean(texture?.IsValid()) && (texture.GetGpuUsage() & Tr2GpuUsage.SHADER_RESOURCE) !== 0;
  }

  /**
   * Carbon `GenerateMipMaps` (`cpp:359-364`).
   *
   * @adapted With no surface (before Create, or released and not yet prepared) this fails, as Carbon's invalid Tr2TextureAL does.
   * @returns {number} An `ALResult` value.
   */
  @be.mapMethodAndWrap()
  GenerateMipMaps(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const texture = this.GetRenderTarget();
    return texture ? texture.GenerateMipMaps(renderContext) : ALResult.E_FAIL;
  }

  /**
   * Carbon `Resolve` (`cpp:366-375`).
   *
   * @implemented
   * @param {Tr2RenderTarget} destination The render target to resolve into.
   * @returns {number} An `ALResult` value.
   */
  @be.mapMethodAndWrap()
  Resolve(destination, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (!destination) return ALResult.E_FAIL;

    // No surface on either side (released and not yet prepared) fails, as Carbon's invalid Tr2TextureAL does.
    const source = this.GetRenderTarget(), target = destination.GetRenderTarget();
    return source && target ? source.Resolve(target, renderContext) : ALResult.E_FAIL;
  }

  /**
   * Carbon Tr2RenderTarget::HasALObject always reports false (cpp:389-392).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  HasALObject(_type, _object)
  {
    return false;
  }

  /**
   * Carbon `GetSharedHandle` (`cpp:400-403`), exposed as `sharedHandle`.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  sharedHandle()
  {
    return this._renderTarget?.GetSharedHandle() ?? null;
  }

  /**
   * Carbon `GetWidth` (`cpp:411-414`).
   *
   * @implemented
   */

  GetWidth()
  {
    return this.GetRenderTarget()?.GetWidth() ?? 0;
  }

  /**
   * Carbon `GetHeight` (`cpp:422-425`).
   *
   * @implemented
   */

  GetHeight()
  {
    return this.GetRenderTarget()?.GetHeight() ?? 0;
  }

  /**
   * Carbon `GetMipCount` (`cpp:433-436`).
   *
   * @implemented
   */

  GetMipCount()
  {
    return this.GetRenderTarget()?.GetMipCount() ?? 0;
  }

  /**
   * Carbon `GetArraySize` (`cpp:444-447`).
   *
   * @implemented
   */

  GetArraySize()
  {
    return this.GetRenderTarget()?.GetArraySize() ?? 0;
  }

  /**
   * Carbon `GetMsaaType` (`cpp:455-458`).
   *
   * @implemented
   */

  GetMsaaType()
  {
    return this.GetRenderTarget()?.GetMsaaDesc().samples ?? 0;
  }

  /**
   * Carbon `GetMsaaQuality` (`cpp:466-469`).
   *
   * @implemented
   */

  GetMsaaQuality()
  {
    return this.GetRenderTarget()?.GetMsaaDesc().quality ?? 0;
  }

  /**
   * Carbon `GetFormat` (`cpp:477-480`).
   *
   * @implemented
   */

  GetFormat()
  {
    return this.GetRenderTarget()?.GetFormat() ?? PixelFormat.PIXEL_FORMAT_UNKNOWN;
  }

  /**
   * Carbon `GetType` (`cpp:482-485`).
   *
   * @implemented
   */

  GetType()
  {
    return this.GetRenderTarget()?.GetType() ?? TextureType.TEX_TYPE_INVALID;
  }

  /**
   * Carbon `SetName` (`cpp:44-48`), which names the texture too.
   *
   * @implemented
   */

  SetName(name)
  {
    this._name = name ?? "";
    this._renderTarget?.SetName(this._name);
  }

  /**
   * Carbon `GetName` (`cpp:50-53`).
   *
   * @implemented
   */

  GetName()
  {
    return this._name;
  }

  /**
   * name (MAP_PROPERTY): Carbon's property over GetName/SetName, which the macro calls.
   * Carbon: MAP_PROPERTY (trinity/trinity/Tr2RenderTarget_Blue.cpp:75).
   *
   * @implemented
   */
  @be.mapProperty()
  @type.string
  get name()
  {
    return this.GetName();
  }

  /** @implemented */
  set name(value)
  {
    this.SetName(value);
  }

  /**
   * width (MAP_PROPERTY_READONLY): Carbon's property over GetWidth, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:77).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  get width()
  {
    return this.GetWidth();
  }

  /**
   * height (MAP_PROPERTY_READONLY): Carbon's property over GetHeight, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:78).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  get height()
  {
    return this.GetHeight();
  }

  /**
   * mipCount (MAP_PROPERTY_READONLY): Carbon's property over GetMipCount, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:79).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  get mipCount()
  {
    return this.GetMipCount();
  }

  /**
   * multiSampleType (MAP_PROPERTY_READONLY): Carbon's property over GetMsaaType, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:80).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  get multiSampleType()
  {
    return this.GetMsaaType();
  }

  /**
   * multiSampleQuality (MAP_PROPERTY_READONLY): Carbon's property over GetMsaaQuality, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:81).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  get multiSampleQuality()
  {
    return this.GetMsaaQuality();
  }

  /**
   * arraySize (MAP_PROPERTY_READONLY): Carbon's property over GetArraySize, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:82).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  get arraySize()
  {
    return this.GetArraySize();
  }

  /**
   * format (MAP_PROPERTY_READONLY): Carbon's property over GetFormat, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:84).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.int32
  @type.enum("trinity.ImageIO.PixelFormat")
  get format()
  {
    return this.GetFormat();
  }

  /**
   * type (MAP_PROPERTY_READONLY): Carbon's property over GetType, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:85).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.int32
  @type.enum("trinity.ImageIO.TextureType")
  get type()
  {
    return this.GetType();
  }

  /**
   * isValid (MAP_PROPERTY_READONLY): Carbon's property over IsValid, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:87).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.boolean
  get isValid()
  {
    return this.IsValid();
  }

  /**
   * isReadable (MAP_PROPERTY_READONLY): Carbon's property over IsReadable, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RenderTarget_Blue.cpp:88).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.boolean
  get isReadable()
  {
    return this.IsReadable();
  }

  /**
   * Carbon `ReleaseResources` (`cpp:488-495`): drop the owned texture when its
   * memory class is being released. The creation parameters are kept.
   *
   * @adapted Explicit Destroy replaces assigning an empty Tr2TextureAL over the owned value.
   * @param {number} storage TriStorageFlags being released.
   */

  ReleaseResources(storage)
  {
    if (this._renderTarget?.IsValid() && (this._renderTarget.GetMemoryClass() & storage))
    {
      this._renderTarget.Destroy();
      this._renderTarget = null;
      this._Changed();
    }
  }

  /**
   * Carbon `OnPrepareResources` (`cpp:498-508`): recreate a released texture
   * on the main-thread context from the parameters it was made with. As in
   * Carbon, the recreated texture is not renamed and its pixels are not restored.
   *
   * @adapted Recreates from the retained AL dimensions; Carbon rebuilds them from m_type, m_format, m_width, m_height, m_mipCount and m_arraySize.
   * @returns {boolean} Always true, as Carbon's.
   */

  _OnPrepareResources()
  {
    if (!this._renderTarget && this._created)
    {
      const { dimensions, msaa, gpuUsage, cpuUsage } = this._created;
      this._renderTarget = Tr2RenderContext_GetMainThreadRenderContext().CreateTexture(dimensions, { gpuUsage, cpuUsage, msaa });
      this._Changed();
    }
    return true;
  }

  /** Carbon's `m_onTextureChange()`. */
  _Changed()
  {
    this._onTextureChange.Broadcast();
  }

  static PixelFormat = PixelFormat;
  static TextureType = TextureType;
}
