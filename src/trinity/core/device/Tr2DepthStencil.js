import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
import { ITr2TextureProvider } from "../ITr2TextureProvider.js";
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
// The `@blue.read` properties below are that READ projection, refreshed wherever
// the texture changes - Create and Destroy are the only two places, which is
// what keeps them from drifting.
//
// THE RENDER CONTEXT IS A PARAMETER. Carbon reaches the main-thread context
// through USE_MAIN_THREAD_RENDER_CONTEXT(), a global we deliberately do not
// have; the same reason Tr2Blitter takes one.
import { meta, type, blue } from "#schema";
import { Tr2Event } from "../Tr2Event.js";
import { ConvertDepthStencilFormat, DepthStencilFormat, ExFlag, Tr2GpuUsage } from "#consts/render-context";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { Tr2MsaaDesc } from "../../../trinityal/Tr2HalHelperStructures/Tr2MsaaDesc.js";
import "#consts/renderContext/formats";

/** Holds the depth-stencil surface a pass renders into, with the parameters it was created with. */
@be.define("Tr2DepthStencil")
@blue.inherit(ITr2TextureProvider)
@be.mapInterface(ITr2TextureProvider)
export class Tr2DepthStencil
{

  /** m_name (std::string) [PERSISTONLY] */
  @be.mapAttribute(be.PERSISTONLY)

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
  multiSampleType = 0;

  @blue.read
  @type.uint32
  multiSampleQuality = 0;

  @blue.read
  @type.uint32
  mipCount = 0;

  @blue.read
  @type.int32
  @type.enum("trinity.Tr2RenderContextEnum.DepthStencilFormat")
  format = 7;

  @blue.read
  @type.boolean
  isValid = false;

  @blue.read
  @type.boolean
  isReadable = false;

  /** m_depthStencil (Tr2TextureAL), the one resource this class exists to hold. */
  #depthStencil = null;

  /** m_msaa (Tr2MsaaDesc), retained so OnPrepareResources can rebuild. */
  #msaa = null;

  /** m_flags (Tr2RenderContextEnum::ExFlag), retained for the same reason. */
  #flags = ExFlag.EX_NONE;

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
   * Adapted: Carbon returns an HRESULT and reaches the main-thread render context through a
   * global; this returns a boolean and takes the context, which is the same reason
   * Tr2Blitter does.
   *
   * @param {number} width Surface width in pixels.
   * @param {number} height Surface height in pixels.
   * @param {number} format A `DepthStencilFormat` value.
   * @param {number} [msaaType] Sample count.
   * @param {number} [msaaQuality] Sample quality.
   * @param {number} [flags] An `ExFlag` value.
   * @param {object} [renderContext] The context to create through.
   * @returns {boolean} Whether the surface was created.
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.adapted
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

    if (this.#depthStencil) this.#depthStencil.Destroy();
    this.#depthStencil = texture;
    this.#msaa = msaa;
    this.#flags = flags;
    this.SetName(this.name);
    this.#Refresh();
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
   * @returns {object|null} The `Tr2TextureAL`, or null when it is not readable.
   */

  @meta.implemented
  GetTexture()
  {
    return this.IsValid() && this.IsReadable() ? this.#depthStencil : null;
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
   * Adapted: Carbon exposes the member directly through a conversion operator; JavaScript
   * has none, so the raw surface is reached by name.
   *
   * @returns {object|null} The `Tr2TextureAL`, or null before Create.
   */
  @blue.method
  @meta.adapted
  GetDepthStencil()
  {
    return this.#depthStencil;
  }

  /**
   * Carbon OnTextureChange (ITr2TextureProvider.h:16): the event fired when the depth stencil's
   * texture changes. Listeners register an owner and an unbound method; the
   * event holds owners weakly.
   *
   * @returns {Tr2Event} m_onTextureChange.
   */

  @meta.implemented
  OnTextureChange()
  {
    return this._onTextureChange;
  }

  /** Carbon `IsValid` (`cpp:95-98`): whether the texture exists. */

  @meta.implemented
  IsValid()
  {
    return Boolean(this.#depthStencil?.IsValid());
  }

  /** Carbon `IsReadable` (`cpp:90-93`): whether the surface carries SHADER_RESOURCE. */

  @meta.implemented
  IsReadable()
  {
    if (!this.#depthStencil) return false;
    return (this.#depthStencil.GetGpuUsage() & Tr2GpuUsage.SHADER_RESOURCE) !== 0;
  }

  /**
   * Releases the surface and returns every parameter to its default.
   *
   * Carbon `Destroy` (`cpp:100-111`), which resets the format to DSFMT_AUTO
   * rather than DSFMT_UNKNOWN.
   *
   * @returns {void}
   */

  @meta.implemented
  Destroy()
  {
    if (this.#depthStencil) this.#depthStencil.Destroy();
    this.#depthStencil = null;
    this.#msaa = null;
    this.#flags = ExFlag.EX_NONE;
    this.format = DepthStencilFormat.DSFMT_AUTO;
    this.#Refresh();
    this._Changed();
  }

  /** Carbon `GetWidth` (`cpp:141-144`), read off the texture. */

  @meta.implemented
  GetWidth()
  {
    return this.#depthStencil?.GetWidth() ?? 0;
  }

  /** Carbon `GetHeight` (`cpp:147-150`), read off the texture. */

  @meta.implemented
  GetHeight()
  {
    return this.#depthStencil?.GetHeight() ?? 0;
  }

  /** Carbon `GetMsaaSamples` (`cpp:153-156`). */

  @meta.implemented
  GetMsaaSamples()
  {
    return this.#msaa?.samples ?? 0;
  }

  /** Carbon `GetMsaaQuality` (`cpp:159-162`). */

  @meta.implemented
  GetMsaaQuality()
  {
    return this.#msaa?.quality ?? 0;
  }

  /** Carbon `GetMipCount` (`cpp:164-167`) returns a literal 1. */

  @meta.implemented
  GetMipCount()
  {
    return 1;
  }

  /** Carbon `GetFormat` (`cpp:170-173`), the format asked for rather than the texture's. */

  @meta.implemented
  GetFormat()
  {
    return this.format;
  }

  /** Carbon `SetName` (`cpp:20-24`), which names the texture too. */

  @meta.implemented
  SetName(name)
  {
    this.name = name ?? "";
    this.#depthStencil?.SetName(this.name);
  }

  /** Carbon `GetName` (`cpp:26-29`). */

  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon Tr2DepthStencil::HasALObject always reports false (cpp:124-127). */
  @be.mapMethodAndWrap()
  @meta.implemented
  HasALObject(_type, _object)
  {
    return false;
  }

  /** Carbon method sharedHandle -> GetSharedHandle (MAP_METHOD_AND_WRAP). */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  sharedHandle(...args)
  {
    throw new Error("Tr2DepthStencil.sharedHandle is not implemented in CarbonEngineJS.");
  }

  /** Republishes the Blue READ projection from the live texture. */
  #Refresh()
  {
    this.width = this.GetWidth();
    this.height = this.GetHeight();
    this.multiSampleType = this.GetMsaaSamples();
    this.multiSampleQuality = this.GetMsaaQuality();
    this.mipCount = this.GetMipCount();
    this.isValid = this.IsValid();
    this.isReadable = this.IsReadable();
  }

  /** Carbon's `m_onTextureChange()`. */
  _Changed()
  {
    this._onTextureChange.Broadcast();
  }

  static DepthStencilFormat = DepthStencilFormat;

  static ExFlag = ExFlag;

}
