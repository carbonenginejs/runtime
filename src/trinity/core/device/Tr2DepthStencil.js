import { exposure as be } from "#be";
import { IRoot } from "../../../blue/exposure/IRoot.js";
import { ITr2TextureProvider } from "../ITr2TextureProvider.js";
import { Tr2DeviceResource } from "./Tr2DeviceResource.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
// Source: trinity/trinity/Tr2DepthStencil.h
//   trinity/trinity/Tr2DepthStencil.cpp
//
// "A class to hang on to platform specific pointers needed for a classic
// depth-and-stencil-buffer setup" - Carbon's own description. It owns ONE
// Tr2TextureAL and the parameters it was made with, and everything else is an
// accessor over that pair.
//
// THE TEXTURE IS NOT A PERSISTED FIELD, and the reason is Carbon's rather than a
// rule about GPU types. `m_depthStencil` is a PUBLIC member there and still not
// Blue-persisted: the exposure is READ properties only. A live device resource
// is not document state, whoever can reach it. (The AL is also why the older
// "no GPUTexture in a Trinity field" framing no longer bites here - what this
// holds is a Tr2TextureAL, which is backend-agnostic and is exactly what Carbon
// holds too.)
//
// The READ properties (width, height, multiSampleType, multiSampleQuality, mipCount, isValid, isReadable) are accessors over Carbon's
// getters, which ask the texture, so nothing is mirrored and nothing can drift.
//
// THE RENDER CONTEXT. Create takes the context as a parameter. Preparation after
// a release takes none and uses the main-thread context, as Carbon does through
// USE_MAIN_THREAD_RENDER_CONTEXT() (cpp:186-202).
//
// DEVICE RESIDENCY. Creating, sampling or rendering into the surface is a use and
// renews it (KeepAlive). An idle surface is released by the device sweep; the next
// use registers it again and the device tick recreates it.
import { type } from "#schema";
import { Tr2Event } from "../Tr2Event.js";
import { ConvertDepthStencilFormat, DepthStencilFormat, ExFlag, Tr2GpuUsage } from "#consts/render-context";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { Tr2MsaaDesc } from "../../../trinityal/Tr2HalHelperStructures/Tr2MsaaDesc.js";
import "#consts/renderContext/formats";

/**
 * Holds the depth-stencil surface a pass renders into, with the parameters it was created with.
 * Carbon: Tr2DepthStencil (trinity/trinity/Tr2DepthStencil.h:19-21)
 */
@be.define("Tr2DepthStencil")
@be.inherit(ITr2TextureProvider, Tr2DeviceResource)
@be.mapInterface(ITr2TextureProvider)
export class Tr2DepthStencil extends IRoot
{

  /**
   * m_name (std::string) [PERSISTONLY]
   *
   * @implemented
   */
  @be.mapAttribute(be.PERSISTONLY, "name")
  @type.string
  _name = "";

  /** Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:47); getter GetFormat only reads m_format. */
  @be.mapPropertyReadOnly__Field()
  @type.int32
  @type.enum("trinity.Tr2RenderContextEnum.DepthStencilFormat")
  format = 7;

  /** m_depthStencil (Tr2TextureAL), the one resource this class exists to hold. */
  _depthStencil = null;

  /** m_msaa (Tr2MsaaDesc), retained so OnPrepareResources can rebuild. */
  _msaa = null;

  /** m_flags (Tr2RenderContextEnum::ExFlag), retained for the same reason. */
  _flags = ExFlag.EX_NONE;

  /** m_width (uint32_t), retained so OnPrepareResources can rebuild; 0 when there is nothing to rebuild. */
  _width = 0;

  /** m_height (uint32_t), retained for the same reason. */
  _height = 0;

  /** m_onTextureChange (OnTextureChangeEvent) */
  _onTextureChange = new Tr2Event();

  /**
   * Creates the depth-stencil surface.
   *
   * Carbon `Create` (`cpp:49-74`). Usage is always DEPTH_STENCIL plus
   * SHADER_RESOURCE - which is what makes the surface sampleable, and therefore
   * what `IsReadable` reports - with SHARED added when the caller asks for it.
   *
   * A FAILED CREATE DESTROYS RATHER THAN LEAVING HALF A SURFACE, which is
   * Carbon's `else Destroy()`. Without it a caller could read a stale width off
   * an object whose texture never came back.
   *
   * @adapted Carbon returns an HRESULT and reaches the main-thread render context through a
   *   global; this returns a boolean and takes the context. Creation is the first use and
   *   registers with the device; Carbon registers in the constructor (Tr2DeviceResource.cpp:6-9).
   * @param {number} width Surface width in pixels.
   * @param {number} height Surface height in pixels.
   * @param {number} format A `DepthStencilFormat` value.
   * @param {number} [msaaType] Sample count.
   * @param {number} [msaaQuality] Sample quality.
   * @param {number} [flags] An `ExFlag` value.
   * @param {object} [renderContext] The context to create through.
   * @returns {boolean} Whether the surface was created.
   */
  @be.mapMethodAndWrapOptionalArgs(1)
  Create(width, height, format, msaaType = 1, msaaQuality = 0, flags = ExFlag.EX_NONE, renderContext = null)
  {
    let gpuUsage = Tr2GpuUsage.DEPTH_STENCIL | Tr2GpuUsage.SHADER_RESOURCE;

    if ((flags & ExFlag.EX_CREATE_SHARED) !== 0) gpuUsage |= Tr2GpuUsage.SHARED;

    const msaa = new Tr2MsaaDesc(msaaType, msaaQuality);
    const texture = renderContext?.CreateTexture(
      Tr2BitmapDimensions.create__WidthHeightMipCountFormat(width, height, 1, ConvertDepthStencilFormat(format)),
      { gpuUsage, msaa }
    );

    if (!texture)
    {
      this.Destroy();
      return false;
    }

    if (this._depthStencil) this._depthStencil.Destroy();
    this._depthStencil = texture;
    this._width = width;
    this._height = height;
    this.format = format;
    this._msaa = msaa;
    this._flags = flags;
    this.KeepAlive();
    this.SetName(this._name);
    this._Changed();
    return true;
  }

  /**
   * The texture, but only when it can actually be sampled.
   *
   * Carbon `GetTexture` (`cpp:76-83`) returns null for a surface without
   * SHADER_RESOURCE usage even though the surface itself is valid. A caller
   * binding the result as a shader input is the reason: a depth buffer that was
   * never made readable must fail here rather than at the draw.
   *
   * @adapted Sampling renews device residency (through GetDepthStencil); Carbon keeps the surface until destruction.
   * @returns {object|null} The `Tr2TextureAL`, or null when it is not readable.
   */

  GetTexture()
  {
    const depthStencil = this.GetDepthStencil();
    return depthStencil?.IsValid() && this.IsReadable() ? depthStencil : null;
  }

  /**
   * The surface itself, readable or not.
   *
   * Carbon reaches `m_depthStencil` directly - it is public, and the class
   * carries `operator Tr2TextureAL&()` for it with the comment "avoid
   * m_depthStencil->m_depthStencil all over the place" (`h:62-69`).
   *
   * THIS IS NOT GetTexture. That one refuses a surface without SHADER_RESOURCE,
   * because its caller is binding a shader input. A caller RENDERING into the
   * surface needs it whether or not it can also be sampled, and would otherwise
   * be told a perfectly good depth buffer does not exist.
   *
   * @adapted Carbon exposes the member directly through a conversion operator; JavaScript
   *   has none, so the raw surface is reached by name. Reading it renews device residency,
   *   so a surface that is only rendered into stays alive. It never creates storage: a getter
   *   may run with no GPU. A released surface answers null until the device tick prepares it.
   * @returns {object|null} The `Tr2TextureAL`, or null before Create and between an idle release and the next prepare.
   */
  GetDepthStencil()
  {
    this.KeepAlive();
    return this._depthStencil;
  }

  /**
   * Carbon OnTextureChange (ITr2TextureProvider.h:16): the event fired when the depth stencil's
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
   * Carbon `IsValid` (`cpp:95-98`): whether the texture exists.
   *
   * @implemented
   */

  IsValid()
  {
    return Boolean(this._depthStencil?.IsValid());
  }

  /**
   * Carbon `IsReadable` (`cpp:90-93`): whether the surface carries SHADER_RESOURCE.
   *
   * @implemented
   */

  IsReadable()
  {
    if (!this._depthStencil) return false;
    return (this._depthStencil.GetGpuUsage() & Tr2GpuUsage.SHADER_RESOURCE) !== 0;
  }

  /**
   * Releases the surface and returns every parameter to its default.
   *
   * Carbon `Destroy` (`cpp:100-111`), which resets the format to DSFMT_AUTO
   * rather than DSFMT_UNKNOWN.
   *
   * @implemented
   * @returns {void}
   */

  Destroy()
  {
    if (this._depthStencil) this._depthStencil.Destroy();
    this._depthStencil = null;
    this._width = 0;
    this._height = 0;
    this._msaa = null;
    this._flags = ExFlag.EX_NONE;
    this.format = DepthStencilFormat.DSFMT_AUTO;
    this._Changed();
  }

  /**
   * Carbon `ReleaseResources` (`cpp:176-183`): drop the surface when its memory
   * class is being released. The creation parameters are kept.
   *
   * @adapted Explicit Destroy replaces assigning an empty Tr2TextureAL over the owned value.
   * @param {number} storage TriStorageFlags being released.
   */
  ReleaseResources(storage)
  {
    if (this._depthStencil?.IsValid() && (storage & this._depthStencil.GetMemoryClass()))
    {
      this._depthStencil.Destroy();
      this._depthStencil = null;
      this._Changed();
    }
  }

  /**
   * Carbon `OnPrepareResources` (`cpp:186-202`): recreate a released surface on the
   * main-thread context from the retained width, height, format, MSAA and flags.
   * As in Carbon, the recreated surface is not renamed.
   *
   * @implemented
   * @returns {boolean} Always true, as Carbon's.
   */
  _OnPrepareResources()
  {
    if (!this._depthStencil?.IsValid() && this._width !== 0)
    {
      let gpuUsage = Tr2GpuUsage.DEPTH_STENCIL | Tr2GpuUsage.SHADER_RESOURCE;

      if ((this._flags & ExFlag.EX_CREATE_SHARED) !== 0) gpuUsage |= Tr2GpuUsage.SHARED;

      this._depthStencil = Tr2RenderContext_GetMainThreadRenderContext().CreateTexture(
        Tr2BitmapDimensions.create__WidthHeightMipCountFormat(this._width, this._height, 1, ConvertDepthStencilFormat(this.format)),
        { gpuUsage, msaa: this._msaa }
      );
      this._Changed();
    }
    return true;
  }

  /**
   * Carbon: Tr2DepthStencil::~Tr2DepthStencil (trinity/trinity/Tr2DepthStencil.cpp:16-18).
   * @adapted The body is empty in Carbon; this releases the Tr2TextureAL value member (h:61) its C++ destructor releases. Graph dispatch handles bases.
   */
  OnDestruct()
  {
    if (this._depthStencil) this._depthStencil.Destroy();
    this._depthStencil = null;
  }

  /**
   * Carbon `GetWidth` (`cpp:141-144`), read off the texture.
   *
   * @implemented
   */

  GetWidth()
  {
    return this._depthStencil?.GetWidth() ?? 0;
  }

  /**
   * Carbon `GetHeight` (`cpp:147-150`), read off the texture.
   *
   * @implemented
   */

  GetHeight()
  {
    return this._depthStencil?.GetHeight() ?? 0;
  }

  /**
   * Carbon `GetMsaaSamples` (`cpp:153-156`).
   *
   * @implemented
   */

  GetMsaaSamples()
  {
    return this._msaa?.samples ?? 0;
  }

  /**
   * Carbon `GetMsaaQuality` (`cpp:159-162`).
   *
   * @implemented
   */

  GetMsaaQuality()
  {
    return this._msaa?.quality ?? 0;
  }

  /**
   * Carbon `GetMipCount` (`cpp:164-167`) returns a literal 1.
   *
   * @implemented
   */

  GetMipCount()
  {
    return 1;
  }

  /**
   * Carbon `GetFormat` (`cpp:170-173`), the format asked for rather than the texture's.
   *
   * @implemented
   */

  GetFormat()
  {
    return this.format;
  }

  /**
   * Carbon `SetName` (`cpp:20-24`), which names the texture too.
   *
   * @implemented
   */

  SetName(name)
  {
    this._name = name ?? "";
    this._depthStencil?.SetName(this._name);
  }

  /**
   * Carbon `GetName` (`cpp:26-29`).
   *
   * @implemented
   */

  GetName()
  {
    return this._name;
  }

  /**
   * name (MAP_PROPERTY): Carbon's property over GetName/SetName, which the macro calls.
   * Carbon: MAP_PROPERTY (trinity/trinity/Tr2DepthStencil_Blue.cpp:41).
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
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:43).
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
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:44).
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
   * multiSampleType (MAP_PROPERTY_READONLY): Carbon's property over GetMsaaSamples, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:45).
   *
   * @implemented
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  get multiSampleType()
  {
    return this.GetMsaaSamples();
  }

  /**
   * multiSampleQuality (MAP_PROPERTY_READONLY): Carbon's property over GetMsaaQuality, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:46).
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
   * mipCount (MAP_PROPERTY_READONLY): Carbon's property over GetMipCount, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:48).
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
   * isValid (MAP_PROPERTY_READONLY): Carbon's property over IsValid, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:52).
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
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2DepthStencil_Blue.cpp:53).
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
   * Carbon Tr2DepthStencil::HasALObject always reports false (cpp:124-127).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  HasALObject(_type, _object)
  {
    return false;
  }

  /**
   * Carbon method sharedHandle -> GetSharedHandle (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  sharedHandle(...args)
  {
    throw new Error("Tr2DepthStencil.sharedHandle is not implemented in CarbonEngineJS.");
  }

  /** Carbon's `m_onTextureChange()`. */
  _Changed()
  {
    this._onTextureChange.Broadcast();
  }

  static DepthStencilFormat = DepthStencilFormat;

  static ExFlag = ExFlag;

}
