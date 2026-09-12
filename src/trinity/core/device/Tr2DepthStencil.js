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
// The `@io.read` properties below are that READ projection, refreshed wherever
// the texture changes - Create and Destroy are the only two places, which is
// what keeps them from drifting.
//
// THE RENDER CONTEXT IS A PARAMETER. Carbon reaches the main-thread context
// through USE_MAIN_THREAD_RENDER_CONTEXT(), a global we deliberately do not
// have; the same reason Tr2Blitter takes one.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { ConvertDepthStencilFormat, DepthStencilFormat, ExFlag, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BitmapDimensions } from "../../../trinityal/Tr2BitmapDimensions.js";
import { Tr2MsaaDesc } from "../../../trinityal/Tr2HalHelperStructures/Tr2MsaaDesc.js";

/** Tr2DepthStencil (trinityCore) - the depth-stencil surface a pass renders into. */
@type.define({ className: "Tr2DepthStencil", family: "trinityCore" })
export class Tr2DepthStencil extends CjsModel
{

  /** m_name (std::string) [PERSISTONLY] */
  @io.persistOnly
  @type.string
  name = "";

  @io.read
  @type.uint32
  width = 0;

  @io.read
  @type.uint32
  height = 0;

  @io.read
  @type.uint32
  multiSampleType = 0;

  @io.read
  @type.uint32
  multiSampleQuality = 0;

  @io.read
  @type.uint32
  mipCount = 0;

  @io.read
  @type.int32
  @type.enum("DepthStencilFormat")
  format = 7;

  @io.read
  @type.boolean
  isValid = false;

  @io.read
  @type.boolean
  isReadable = false;

  /** m_depthStencil (Tr2TextureAL), the one resource this class exists to hold. */
  #depthStencil = null;

  /** m_msaa (Tr2MsaaDesc), retained so OnPrepareResources can rebuild. */
  #msaa = null;

  /** m_flags (Tr2RenderContextEnum::ExFlag), retained for the same reason. */
  #flags = ExFlag.EX_NONE;

  /** Carbon's m_onTextureChange listeners. */
  #listeners = [];

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
   * @param {number} width Surface width in pixels.
   * @param {number} height Surface height in pixels.
   * @param {number} format A `DepthStencilFormat` value.
   * @param {number} [msaaType] Sample count.
   * @param {number} [msaaQuality] Sample quality.
   * @param {number} [flags] An `ExFlag` value.
   * @param {object} [renderContext] The context to create through.
   * @returns {boolean} Whether the surface was created.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns an HRESULT and reaches the main-thread render context through a global; this returns a boolean and takes the context, which is the same reason Tr2Blitter does.")
  Create(width, height, format, msaaType = 1, msaaQuality = 0, flags = ExFlag.EX_NONE, renderContext = null)
  {
    let gpuUsage = Tr2GpuUsage.DEPTH_STENCIL | Tr2GpuUsage.SHADER_RESOURCE;

    if ((flags & ExFlag.EX_CREATE_SHARED) !== 0) gpuUsage |= Tr2GpuUsage.SHARED;

    const msaa = new Tr2MsaaDesc(msaaType, msaaQuality);
    const texture = renderContext?.CreateTexture(
      Tr2BitmapDimensions.Texture2D(width, height, 1, ConvertDepthStencilFormat(format)),
      { gpuUsage, msaa }
    );

    if (!texture)
    {
      this.Destroy();
      return false;
    }

    this.#depthStencil = texture;
    this.#msaa = msaa;
    this.#flags = flags;
    this.SetName(this.name);
    this.#Refresh();
    this.#Changed();
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
  @carbon.method
  @impl.implemented
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
   * @returns {object|null} The `Tr2TextureAL`, or null before Create.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon exposes the member directly through a conversion operator; JavaScript has none, so the raw surface is reached by name.")
  GetDepthStencil()
  {
    return this.#depthStencil;
  }

  /**
   * Registers a texture-change listener (Carbon's `OnTextureChange` event).
   *
   * @param {Function} listener Called with this surface after each change.
   * @returns {Function} Unsubscribe.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns its event object for the caller to attach to; this takes the listener and returns the unsubscribe, matching Tr2TextureArray.")
  OnTextureChange(listener)
  {
    this.#listeners.push(listener);
    return () =>
    {
      const at = this.#listeners.indexOf(listener);
      if (at !== -1) this.#listeners.splice(at, 1);
    };
  }

  /** Carbon `IsValid` (`cpp:95-98`): whether the texture exists. */
  @carbon.method
  @impl.implemented
  IsValid()
  {
    return Boolean(this.#depthStencil?.IsValid());
  }

  /** Carbon `IsReadable` (`cpp:90-93`): whether the surface carries SHADER_RESOURCE. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  Destroy()
  {
    this.#depthStencil = null;
    this.#msaa = null;
    this.#flags = ExFlag.EX_NONE;
    this.format = DepthStencilFormat.DSFMT_AUTO;
    this.#Refresh();
    this.#Changed();
  }

  /** Carbon `GetWidth` (`cpp:141-144`), read off the texture. */
  @carbon.method
  @impl.implemented
  GetWidth()
  {
    return this.#depthStencil?.GetWidth() ?? 0;
  }

  /** Carbon `GetHeight` (`cpp:147-150`), read off the texture. */
  @carbon.method
  @impl.implemented
  GetHeight()
  {
    return this.#depthStencil?.GetHeight() ?? 0;
  }

  /** Carbon `GetMsaaSamples` (`cpp:153-156`). */
  @carbon.method
  @impl.implemented
  GetMsaaSamples()
  {
    return this.#msaa?.samples ?? 0;
  }

  /** Carbon `GetMsaaQuality` (`cpp:159-162`). */
  @carbon.method
  @impl.implemented
  GetMsaaQuality()
  {
    return this.#msaa?.quality ?? 0;
  }

  /** Carbon `GetMipCount` (`cpp:164-167`) returns a literal 1. */
  @carbon.method
  @impl.implemented
  GetMipCount()
  {
    return 1;
  }

  /** Carbon `GetFormat` (`cpp:170-173`), the format asked for rather than the texture's. */
  @carbon.method
  @impl.implemented
  GetFormat()
  {
    return this.format;
  }

  /** Carbon `SetName` (`cpp:20-24`), which names the texture too. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = name ?? "";
    this.#depthStencil?.SetName(this.name);
  }

  /** Carbon `GetName` (`cpp:26-29`). */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon Tr2DepthStencil::HasALObject always reports false (cpp:124-127). */
  @carbon.method
  @impl.implemented
  HasALObject(_type, _object)
  {
    return false;
  }

  /** Carbon method sharedHandle -> GetSharedHandle (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
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
  #Changed()
  {
    for (const listener of this.#listeners) listener(this);
  }

  static DepthStencilFormat = DepthStencilFormat;

  static ExFlag = ExFlag;

}
