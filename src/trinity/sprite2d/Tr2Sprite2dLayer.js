// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLayer.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLayer.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dLayer_Blue.cpp
// Promoted to hand-maintained source 2026-10-12 from the generated property shell.
import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";
import { CCP_LOGERR } from "../../global/logging/ccpLog.js";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { BitmapDimensions } from "#imageio";
import { Failed, Tr2TextureAL } from "#trinityal";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { Tr2Renderer } from "../core/Tr2Renderer.js";
import { TriDevice } from "../core/device/TriDevice.js";
import { Tr2SpriteObjectBlendMode, Tr2SpriteObjectEffect } from "../generated/sprite2d/enums.js";
import { ITr2Sprite2dTextureNotifyTarget } from "./ITr2Sprite2dTextureNotifyTarget.js";
import { Tr2Sprite2dContainer } from "./Tr2Sprite2dContainer.js";

/**
 * Carbon's `(uint32_t)` cast of a float display extent (Tr2Sprite2dLayer.cpp:96, 119): truncation
 * toward zero, kept in 32 bits.
 *
 * @param {number} value Display width or height.
 * @returns {number} The unsigned 32-bit extent.
 */
function toUint32(value)
{
  return Math.trunc(value) >>> 0;
}

/**
 * Tr2Sprite2dLayer renders its children into its own render target, then draws that target into
 * the parent as one sprite with the layer's colour, effect and blend mode (Tr2Sprite2dLayer.h:16-62).
 * It is a Tr2Sprite2dContainer, a Tr2DeviceResource and an ITr2Sprite2dTextureNotifyTarget. JS
 * has one base class, so the device resource is the `TriDevice` registration in the constructor
 * plus `PrepareResources`/`ReleaseResources` here, as on the other Trinity device resources.
 */
@blue.define({ className: "Tr2Sprite2dLayer", purpose: "Defines a sprite container layer with blend and effect state plus optional background clearing." })
@blue.chainTo(Tr2Sprite2dContainer)
@blue.inherit(ITr2Sprite2dTextureNotifyTarget)
@blue.interface()
export class Tr2Sprite2dLayer extends Tr2Sprite2dContainer
{

  /** Carbon Tr2DeviceResource::Tr2DeviceResource (Tr2DeviceResource.cpp:10-13) registers with the device. */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /** m_backgroundColor (Color) [READWRITE, PERSIST, NOTIFY]: clear colour when `clearBackground` is set. */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.color
  backgroundColor = vec4.fromValues(0, 0, 0, 0);

  /** m_color (Color) [READWRITE, PERSIST, NOTIFY]: tint of the layer sprite. */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_clearBackground (bool) [READWRITE, PERSIST, NOTIFY]: whether the target is cleared before the children draw. */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  clearBackground = true;

  /** m_blendMode (Tr2SpriteObjectBlendMode) [READWRITE, ENUM, NOTIFY]: how the layer blends with the background. */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("Tr2SpriteObjectBlendMode")
  blendMode = Tr2SpriteObjectBlendMode.TR2_SBM_NONE;

  /** m_spriteEffect (Tr2SpriteObjectEffect) [READWRITE, ENUM, NOTIFY]: Carbon's constructor sets TR2_SFX_COPY (Tr2Sprite2dLayer.cpp:16). */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("Tr2SpriteObjectEffect")
  spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_COPY;

  /** textureSecondary (MAP_PROPERTY GetTextureSecondary/SetTextureSecondary): secondary texture for the layer sprite. */
  @blue.property()
  @type.rootRef("ITr2Sprite2dTexture")
  get textureSecondary()
  {
    return this._GetTextureSecondary();
  }

  /**
   * Replaces the secondary texture and its change subscription.
   * @param {ITr2Sprite2dTexture|null} value New secondary texture.
   */
  set textureSecondary(value)
  {
    this._SetTextureSecondary(value);
  }

  /**
   * children [READ, PERSIST]: Tr2Sprite2dLayer_Blue.cpp re-maps the inherited `m_children` with
   * PERSIST, where Tr2Sprite2dContainerBase exposes it READ only. The redeclaration keeps the
   * list the base constructor created and wired for notifications.
   */
  @blue.read
  @blue.persist
  @type.list("ITr2SpriteObject")
  children = this.children;

  /** Carbon m_renderTarget: the layer's render target, uncreated until gathered. @type {Tr2TextureAL} */
  _renderTarget = new Tr2TextureAL();

  /** Carbon m_textureSecondary. @type {ITr2Sprite2dTexture|null} */
  _textureSecondary = null;

  static Tr2SpriteObjectBlendMode = Tr2SpriteObjectBlendMode;

  static Tr2SpriteObjectEffect = Tr2SpriteObjectEffect;

  /**
   * Carbon Tr2Sprite2dLayer::SetChildDirty (Tr2Sprite2dLayer.cpp:30-37).
   *
   * @param {ITr2SpriteObject} _child The child that changed.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  SetChildDirty(_child)
  {
    this.isDirty = true;
    if (this._parent) this._parent.SetChildDirty(this);
  }

  /**
   * Carbon Tr2Sprite2dLayer::GatherSprites (Tr2Sprite2dLayer.cpp:39-85). This replaces the
   * container's traversal: the scene's `StartLayer` redirects drawing into the layer's render
   * target with fresh transform and clip stacks, the children are re-gathered only when the
   * layer is dirty, and `EndLayer` draws the target into the parent at the layer's rectangle.
   *
   * The render context's `Clear` takes the JS options object; `{ clearColor: true }` is Carbon's
   * `CLEARFLAGS_TARGET` with depth and stencil 0 (cpp:64).
   *
   * @param {Tr2Sprite2dScene} renderer Scene gathering this layer.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  GatherSprites(renderer)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (!this.display) return;

    this._AllocateRenderTarget();
    if (!this._renderTarget.IsValid()) return;

    renderer.StartLayer(this._renderTarget);

    const oldOpacity = renderer.GetAccumulatedAlpha();
    renderer.SetAccumulatedAlpha(this.opacity * oldOpacity);

    if (this.isDirty)
    {
      if (this.clearBackground) renderContext.Clear({ clearColor: true, clearDepth: false, clearStencil: false, color: this.backgroundColor, depth: 0, stencil: 0 });

      for (let index = this.background.length - 1; index >= 0; index--) this.background[index].GatherSprites(renderer);
      for (let index = this.children.length - 1; index >= 0; index--) this.children[index].GatherSprites(renderer);

      this.isDirty = false;
    }

    renderer.SetColor(this.color);
    renderer.SetSpriteEffect(this.spriteEffect);
    renderer.SetBlendmode(this.blendMode);
    renderer.EndLayer(this.displayX, this.displayY, this.displayWidth, this.displayHeight, this._textureSecondary);

    renderer.SetAccumulatedAlpha(oldOpacity);
  }

  /**
   * Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-33): creates nothing
   * while resource creation is disallowed, and reports success.
   *
   * @returns {boolean} False only when `OnPrepareResources` fails.
   */
  @meta.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      if (!this._OnPrepareResources()) return false;
    }

    return true;
  }

  /**
   * Carbon Tr2Sprite2dLayer::OnPrepareResources (Tr2Sprite2dLayer.cpp:87-110): a B8G8R8A8
   * render target the size of the display rectangle, readable as a shader resource. Carbon's
   * memory statistic is not ported.
   *
   * @returns {boolean} Whether the render target exists.
   */
  @meta.implemented
  @blue.method
  _OnPrepareResources()
  {
    if (this._renderTarget.IsValid()) return true;

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    const result = this._renderTarget.Create__GpuUsageCpuUsage(
      BitmapDimensions.create__WidthHeightMipCountFormat(toUint32(this.displayWidth), toUint32(this.displayHeight), 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM),
      Tr2GpuUsage.SHADER_RESOURCE | Tr2GpuUsage.RENDER_TARGET, Tr2CpuUsage.READ,
      renderContext);

    if (Failed(result))
    {
      CCP_LOGERR("Tr2Sprite2dLayer::AllocateRenderTarget failed to create a render target");
      return false;
    }

    return true;
  }

  /**
   * Carbon Tr2Sprite2dLayer::ReleaseResources (Tr2Sprite2dLayer.cpp:112-115).
   *
   * @param {number} [_storage] Carbon's TriStorage; unused, as in Carbon.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  ReleaseResources(_storage)
  {
    this._FreeRenderTarget();
  }

  /**
   * Carbon Tr2Sprite2dLayer::AllocateRenderTarget (Tr2Sprite2dLayer.cpp:117-129): keeps a valid
   * target of the current display size, otherwise marks the layer dirty and recreates it.
   *
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _AllocateRenderTarget()
  {
    if (this._renderTarget.IsValid() && toUint32(this.displayWidth) === this._renderTarget.GetWidth() && toUint32(this.displayHeight) === this._renderTarget.GetHeight()) return;

    this.isDirty = true;

    this._FreeRenderTarget();

    this.PrepareResources();
  }

  /**
   * Carbon Tr2Sprite2dLayer::FreeRenderTarget (Tr2Sprite2dLayer.cpp:131-136).
   *
   * Adapted: Carbon assigns an empty `Tr2TextureAL`, releasing its reference; JS has no
   * reference counting, so the value is destroyed explicitly and replaced. The memory statistic
   * is not ported.
   *
   * @returns {void}
   */
  @meta.adapted
  @blue.method
  _FreeRenderTarget()
  {
    this._renderTarget.Destroy();
    this._renderTarget = new Tr2TextureAL();
  }

  /**
   * Carbon Tr2Sprite2dLayer::GetVertexCount (Tr2Sprite2dLayer.cpp:138-142): asserts in debug
   * builds and returns 0.
   *
   * @returns {number} 0.
   */
  @meta.implemented
  @blue.method
  GetVertexCount()
  {
    return 0;
  }

  /**
   * Carbon Tr2Sprite2dLayer::SetTextureSecondary (Tr2Sprite2dLayer.cpp:144-159): moves the change
   * subscription and marks the layer dirty.
   *
   * @param {ITr2Sprite2dTexture|null} t New secondary texture.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  _SetTextureSecondary(t)
  {
    if (t !== this._textureSecondary)
    {
      if (this._textureSecondary) this._textureSecondary.UnregisterForChangeNotification(this);
      this._textureSecondary = t;
      if (this._textureSecondary) this._textureSecondary.RegisterForChangeNotification(this);
      this.SetDirty();
    }
  }

  /**
   * Carbon Tr2Sprite2dLayer::GetTextureSecondary (Tr2Sprite2dLayer.cpp:161-164).
   *
   * @returns {ITr2Sprite2dTexture|null} The secondary texture.
   */
  @meta.implemented
  @blue.method
  _GetTextureSecondary()
  {
    return this._textureSecondary;
  }

  /**
   * Carbon Tr2Sprite2dLayer::Sprite2dTextureChanged (Tr2Sprite2dLayer.cpp:166-169), the
   * ITr2Sprite2dTextureNotifyTarget callback.
   *
   * @param {ITr2Sprite2dTexture} _p The texture that changed.
   * @returns {void}
   */
  @meta.implemented
  @blue.method
  Sprite2dTextureChanged(_p)
  {
    this.SetDirty();
  }

  /**
   * Explicit owner teardown for Carbon's destructor (Tr2Sprite2dLayer.cpp:21-28) and
   * Tr2DeviceResource's (Tr2DeviceResource.cpp:15-18), which JS has no deterministic equivalent
   * of: frees the target, drops the texture subscription and unregisters from the device.
   *
   * @returns {void}
   */
  Destroy()
  {
    this._FreeRenderTarget();
    if (this._textureSecondary) this._textureSecondary.UnregisterForChangeNotification(this);
    TriDevice.UnregisterResource(this);
    super.Destroy();
  }

}
