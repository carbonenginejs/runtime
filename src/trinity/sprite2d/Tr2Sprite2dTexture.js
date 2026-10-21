import { exposure as be } from "#be";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTexture.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTexture.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTexture_Blue.cpp
// Hand-maintained after promotion from generated schema intake.
import { ITr2Sprite2dTexture } from "./ITr2Sprite2dTexture.js";
// Imported for the listener set's JSDoc type and so the interface is in the build graph.
import { ITr2Sprite2dTextureNotifyTarget } from "./ITr2Sprite2dTextureNotifyTarget.js";
import { ITr2AtlasTextureNotifyTarget } from "../core/ITr2AtlasTextureNotifyTarget.js";
import { meta, type, blue } from "#schema";
import { IInitialize, INotify } from "#blue";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { Tr2Sprite2dTextureSettings } from "../generated/sprite2d/enums.js";

/**
 * Wraps a supplied atlas texture with cropping, tiling, transforms and listeners.
 * Atlas resource acquisition remains unported; Apply uses the native scene
 * contract, whose GPU renderer is a separate unfinished implementation.
 */
@blue.define({ className: "Tr2Sprite2dTexture", purpose: "Describes a named 2D texture transform around separate rotation and scaling centers." })
@blue.inherit(IInitialize, INotify, ITr2AtlasTextureNotifyTarget)
@blue.interface(ITr2Sprite2dTexture, IInitialize, INotify)
export class Tr2Sprite2dTexture extends ITr2Sprite2dTexture
{

  /** m_rotationCenter (Vector2) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.vec2
  rotationCenter = vec2.fromValues(0.5, 0.5);

  /** m_scalingCenter (Vector2) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.vec2
  scalingCenter = vec2.fromValues(0.5, 0.5);

  /** m_useTransform (bool) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.boolean
  useTransform = false;

  /** m_name (std::wstring) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.wstring
  name = "";

  /** m_rotation (float) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  rotation = 0;

  /** m_scale (Vector2) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.vec2
  scale = vec2.fromValues(1, 1);

  /** m_scalingRotation (float) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  scalingRotation = 0;

  /** m_translation (Vector2) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.vec2
  translation = vec2.create();


  /**
   * m_changeListeners (Tr2Sprite2dTexture.h:128): the registered targets;
   * duplicate registrations identify one listener.
   *
   * @type {Set<ITr2Sprite2dTextureNotifyTarget>}
   */
  _changeListeners = new Set();

  /**
   * Carbon RegisterForChangeNotification (Tr2Sprite2dTexture.cpp:283-286).
   *
   * @param {ITr2Sprite2dTextureNotifyTarget} target The listener.
   * @returns {void}
   */

  @meta.implemented
  RegisterForChangeNotification(target)
  {
    this._changeListeners.add(target);
  }

  /**
   * Carbon UnregisterForChangeNotification (Tr2Sprite2dTexture.cpp:288-291);
   * set erasure ignores an absent registration.
   *
   * @param {ITr2Sprite2dTextureNotifyTarget} target The listener.
   * @returns {void}
   */

  @meta.implemented
  UnregisterForChangeNotification(target)
  {
    this._changeListeners.delete(target);
  }

  /** Every mapped transform edit invalidates listeners, regardless of its name. */

  @meta.implemented
  OnModified(_name)
  {
    this._SetDirty();
    return true;
  }

  /** Forwards the native atlas-change callback through the same invalidation. */

  @meta.implemented
  AtlasTextureChanged(_texture)
  {
    this._SetDirty();
  }

  /**
   * Carbon protected SetDirty (Tr2Sprite2dTexture.h:83-84, cpp:299-305):
   * calls Sprite2dTextureChanged on each registered target with this texture.
   *
   * @returns {void}
   */
  @meta.implemented

  _SetDirty()
  {
    for (const target of this._changeListeners) target.Sprite2dTextureChanged(this);
  }

  _resPath = "";
  _atlasTexture = null;
  _hasTextureWindow = false;
  _srcX = 0;
  _srcY = 0;
  _srcWidth = 0;
  _srcHeight = 0;
  _settings = Tr2Sprite2dTextureSettings.S2D_TS_NONE;
  _transform = mat4.create();

  /**
   * Explicit JS destruction replaces the native atlas-listener destructor.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    if (this._atlasTexture) this._atlasTexture.UnregisterForChangeNotification(this);
    this._atlasTexture = null;
    this._changeListeners.clear();
  }

  /** Initializes the authored resource path; directly supplied atlas textures need no load. */

  @meta.implemented
  Initialize()
  {
    if (this._resPath) this.SetResPath(this._resPath);
    return true;
  }

  /** Returns the authored resource path, cleared by direct atlas assignment. */

  @meta.implemented
  GetResPath()
  {
    return this._resPath;
  }

  /**
   * Native acquisition requires the atlas modifier and a live Tr2AtlasTexture
   * resource owner. Neither is implemented; a plain texture is not a substitute.
   */

  @meta.notImplemented
  SetResPath(_path)
  {
    throw new Error("Tr2Sprite2dTexture.SetResPath requires the unported atlas resource acquisition path.");
  }

  /** Returns the supplied native atlas texture. */

  @meta.implemented
  GetAtlasTexture()
  {
    return this._atlasTexture;
  }

  /** Replaces the atlas listener, clears the path, and notifies texture users. */

  @meta.implemented
  SetAtlasTexture(texture)
  {
    if (this._atlasTexture) this._atlasTexture.UnregisterForChangeNotification(this);
    this._atlasTexture = texture;
    if (texture) texture.RegisterForChangeNotification(this);
    this._resPath = "";
    this._SetDirty();
  }

  /** Applies native texture, optional window, transform, and tile settings in order. */

  @meta.implemented
  Apply(renderer, index)
  {
    renderer.SetTexture(index, this._atlasTexture, this._settings);
    if (this._hasTextureWindow) renderer.SetTextureWindow(index, this._srcX, this._srcY, this._srcWidth, this._srcHeight);
    renderer.SetTextureTransform(index, this.GetTransform());
    renderer.SetTileMode(this._settings);
  }

  /** Zero rectangles and exact full-texture rectangles need no texture window. */

  @meta.implemented
  CheckTextureWindow()
  {
    if (this._srcX === 0 && this._srcY === 0 && this._srcWidth === 0 && this._srcHeight === 0)
    {
      this._hasTextureWindow = false;
      return;
    }
    if (this._atlasTexture && this._srcX === 0 && this._srcY === 0
      && this._srcWidth === this._atlasTexture.GetWidth() && this._srcHeight === this._atlasTexture.GetHeight())
    {
      this._hasTextureWindow = false;
      return;
    }
    this._hasTextureWindow = true;
  }

  /**
   * Recomputes the native centered 2D transform into retained storage.
   * Carbon Matrix.cpp:147-220 applies m1..m7 in row-vector order; gl's
   * post-multiplies are reversed here, m7 through m1, without per-call vectors.
   */

  @meta.implemented
  GetTransform()
  {
    if (!this.useTransform) return null;
    const out = this._transform, vec3_0 = Tr2Sprite2dTexture.scratch.vec3_0;
    vec3.set(vec3_0, this.rotationCenter[0] + this.translation[0], this.rotationCenter[1] + this.translation[1], 0);
    mat4.fromTranslation(out, vec3_0);
    mat4.rotateZ(out, out, this.rotation);
    vec3.set(vec3_0, this.scalingCenter[0] - this.rotationCenter[0], this.scalingCenter[1] - this.rotationCenter[1], 0);
    mat4.translate(out, out, vec3_0);
    mat4.rotateZ(out, out, this.scalingRotation);
    vec3.set(vec3_0, this.scale[0], this.scale[1], 1);
    mat4.scale(out, out, vec3_0);
    mat4.rotateZ(out, out, -this.scalingRotation);
    vec3.set(vec3_0, -this.scalingCenter[0], -this.scalingCenter[1], 0);
    mat4.translate(out, out, vec3_0);
    return out;
  }

  /** Reads the native repeat bits shifted down by one. */

  @meta.implemented
  GetTextureRepeatMode()
  {
    return (this._settings & (Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_MIRROR | Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_CLAMP)) >> 1;
  }

  /**
   * Preserves the native quirk: cpp:238-243 writes the input without shifting,
   * although GetTextureRepeatMode shifts its result. Other bits are retained.
   */

  @meta.implemented
  SetTextureRepeatMode(value)
  {
    const rest = this._settings & ~(Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_MIRROR | Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_CLAMP);
    this._settings = rest | value;
    this._SetDirty();
  }

  /** Returns the native source-rectangle x value. */

  @meta.implemented
  GetSrcX()
  {
    return this._srcX;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */

  @meta.implemented
  SetSrcX(value)
  {
    this._srcX = value;
    this.CheckTextureWindow();
    this._SetDirty();
  }

  /** Returns the native source-rectangle y value. */

  @meta.implemented
  GetSrcY()
  {
    return this._srcY;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */

  @meta.implemented
  SetSrcY(value)
  {
    this._srcY = value;
    this.CheckTextureWindow();
    this._SetDirty();
  }

  /** Returns the native source-rectangle width value. */

  @meta.implemented
  GetSrcWidth()
  {
    return this._srcWidth;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */

  @meta.implemented
  SetSrcWidth(value)
  {
    this._srcWidth = value;
    this.CheckTextureWindow();
    this._SetDirty();
  }

  /** Returns the native source-rectangle height value. */

  @meta.implemented
  GetSrcHeight()
  {
    return this._srcHeight;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */

  @meta.implemented
  SetSrcHeight(value)
  {
    this._srcHeight = value;
    this.CheckTextureWindow();
    this._SetDirty();
  }

  /** Delegates native width to the atlas texture when present. */

  @meta.implemented
  GetWidth()
  {
    return this._atlasTexture ? this._atlasTexture.GetWidth() : 0;
  }

  /** Delegates native height to the atlas texture when present. */

  @meta.implemented
  GetHeight()
  {
    return this._atlasTexture ? this._atlasTexture.GetHeight() : 0;
  }

  /** Delegates native isloading to the atlas texture when present. */

  @meta.implemented
  IsLoading()
  {
    return this._atlasTexture ? this._atlasTexture.IsLoading() : false;
  }

  /** Delegates native isgood to the atlas texture when present. */

  @meta.implemented
  IsGood()
  {
    return this._atlasTexture ? this._atlasTexture.IsGood() : false;
  }

  /** Reads the native tile-x bit. */

  @meta.implemented
  GetTileX()
  {
    return (this._settings & Tr2Sprite2dTextureSettings.S2D_TS_TILE_X) !== 0;
  }

  /** Changes only the tile-x bit and notifies listeners. */

  @meta.implemented
  SetTileX(value)
  {
    if (value) this._settings |= Tr2Sprite2dTextureSettings.S2D_TS_TILE_X;
    else this._settings &= ~Tr2Sprite2dTextureSettings.S2D_TS_TILE_X;
    this._SetDirty();
  }

  /** Reads the native tile-y bit. */

  @meta.implemented
  GetTileY()
  {
    return (this._settings & Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y) !== 0;
  }

  /** Changes only the tile-y bit and notifies listeners. */

  @meta.implemented
  SetTileY(value)
  {
    if (value) this._settings |= Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y;
    else this._settings &= ~Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y;
    this._SetDirty();
  }

  /** Native Blue resPath property. */
  @be.mapProperty()
  @type.path
  get resPath()
  {
    return this.GetResPath();
  }

  /** Delegates the native Blue resPath setter. */
  set resPath(value)
  {
    this.SetResPath(value);
  }

  /** Native Blue atlasTexture property. */
  @be.mapProperty()
  @type.rootRef("Tr2AtlasTexture")
  get atlasTexture()
  {
    return this.GetAtlasTexture();
  }

  /** Delegates the native Blue atlasTexture setter. */
  set atlasTexture(value)
  {
    this.SetAtlasTexture(value);
  }

  /** Native Blue repeatMode property. */
  @be.mapProperty()
  @type.int32
  get repeatMode()
  {
    return this.GetTextureRepeatMode();
  }

  /** Delegates the native Blue repeatMode setter. */
  set repeatMode(value)
  {
    this.SetTextureRepeatMode(value);
  }

  /** Native Blue srcX property. */
  @be.mapProperty()
  @type.float32
  get srcX()
  {
    return this.GetSrcX();
  }

  /** Delegates the native Blue srcX setter. */
  set srcX(value)
  {
    this.SetSrcX(value);
  }

  /** Native Blue srcY property. */
  @be.mapProperty()
  @type.float32
  get srcY()
  {
    return this.GetSrcY();
  }

  /** Delegates the native Blue srcY setter. */
  set srcY(value)
  {
    this.SetSrcY(value);
  }

  /** Native Blue srcWidth property. */
  @be.mapProperty()
  @type.float32
  get srcWidth()
  {
    return this.GetSrcWidth();
  }

  /** Delegates the native Blue srcWidth setter. */
  set srcWidth(value)
  {
    this.SetSrcWidth(value);
  }

  /** Native Blue srcHeight property. */
  @be.mapProperty()
  @type.float32
  get srcHeight()
  {
    return this.GetSrcHeight();
  }

  /** Delegates the native Blue srcHeight setter. */
  set srcHeight(value)
  {
    this.SetSrcHeight(value);
  }

  /** Native Blue tileX property. */
  @be.mapProperty()
  @type.boolean
  get tileX()
  {
    return this.GetTileX();
  }

  /** Delegates the native Blue tileX setter. */
  set tileX(value)
  {
    this.SetTileX(value);
  }

  /** Native Blue tileY property. */
  @be.mapProperty()
  @type.boolean
  get tileY()
  {
    return this.GetTileY();
  }

  /** Delegates the native Blue tileY setter. */
  set tileY(value)
  {
    this.SetTileY(value);
  }

  static scratch = { vec3_0: vec3.create() };
}
