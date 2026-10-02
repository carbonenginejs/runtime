// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTexture.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTexture.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTexture_Blue.cpp
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";
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
@meta.define({ className: "Tr2Sprite2dTexture", family: "sprite2d", purpose: "Describes a named 2D texture transform around separate rotation and scaling centers." })
@meta.blue.inherit(IInitialize, INotify)
export class Tr2Sprite2dTexture
{

  /** m_rotationCenter (Vector2) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.vec2
  rotationCenter = vec2.fromValues(0.5, 0.5);

  /** m_scalingCenter (Vector2) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.vec2
  scalingCenter = vec2.fromValues(0.5, 0.5);

  /** m_useTransform (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  useTransform = false;

  /** m_name (std::wstring) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.string
  name = "";

  /** m_rotation (float) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  rotation = 0;

  /** m_scale (Vector2) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.vec2
  scale = vec2.fromValues(1, 1);

  /** m_scalingRotation (float) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  scalingRotation = 0;

  /** m_translation (Vector2) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.vec2
  translation = vec2.create();


  /** Native change-target set; duplicate registrations identify one listener. */
  _changeListeners = new Set();

  /** Registers a native ITr2Sprite2dTextureNotifyTarget by object identity. */
  @meta.blue.method
  @meta.implemented
  RegisterForChangeNotification(target)
  {
    this._changeListeners.add(target);
  }

  /** Removes the target; native set erasure ignores an absent registration. */
  @meta.blue.method
  @meta.implemented
  UnregisterForChangeNotification(target)
  {
    this._changeListeners.delete(target);
  }

  /** Every mapped transform edit invalidates listeners, regardless of its name. */
  @meta.blue.method
  @meta.implemented
  OnModified(_name)
  {
    this.SetDirty();
    return true;
  }

  /** Forwards the native atlas-change callback through the same invalidation. */
  @meta.blue.method
  @meta.implemented
  AtlasTextureChanged(_texture)
  {
    this.SetDirty();
  }

  /** Notifies each registered target with this texture as the changed identity. */
  @meta.blue.method
  @meta.implemented
  SetDirty()
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

  /** Explicit JS destruction replaces the native atlas-listener destructor. */
  @meta.ours
  Destroy()
  {
    if (this._atlasTexture) this._atlasTexture.UnregisterForChangeNotification(this);
    this._atlasTexture = null;
    this._changeListeners.clear();
  }

  /** Initializes the authored resource path; directly supplied atlas textures need no load. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    if (this._resPath) this.SetResPath(this._resPath);
    return true;
  }

  /** Returns the authored resource path, cleared by direct atlas assignment. */
  @meta.blue.method
  @meta.implemented
  GetResPath()
  {
    return this._resPath;
  }

  /**
   * Native acquisition requires the atlas modifier and a live Tr2AtlasTexture
   * resource owner. Neither is implemented; a plain texture is not a substitute.
   */
  @meta.blue.method
  @meta.notImplemented
  SetResPath(_path)
  {
    throw new Error("Tr2Sprite2dTexture.SetResPath requires the unported atlas resource acquisition path.");
  }

  /** Returns the supplied native atlas texture. */
  @meta.blue.method
  @meta.implemented
  GetAtlasTexture()
  {
    return this._atlasTexture;
  }

  /** Replaces the atlas listener, clears the path, and notifies texture users. */
  @meta.blue.method
  @meta.implemented
  SetAtlasTexture(texture)
  {
    if (this._atlasTexture) this._atlasTexture.UnregisterForChangeNotification(this);
    this._atlasTexture = texture;
    if (texture) texture.RegisterForChangeNotification(this);
    this._resPath = "";
    this.SetDirty();
  }

  /** Applies native texture, optional window, transform, and tile settings in order. */
  @meta.blue.method
  @meta.implemented
  Apply(renderer, index)
  {
    renderer.SetTexture(index, this._atlasTexture, this._settings);
    if (this._hasTextureWindow) renderer.SetTextureWindow(index, this._srcX, this._srcY, this._srcWidth, this._srcHeight);
    renderer.SetTextureTransform(index, this.GetTransform());
    renderer.SetTileMode(this._settings);
  }

  /** Zero rectangles and exact full-texture rectangles need no texture window. */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  GetTextureRepeatMode()
  {
    return (this._settings & (Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_MIRROR | Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_CLAMP)) >> 1;
  }

  /**
   * Preserves the native quirk: cpp:238-243 writes the input without shifting,
   * although GetTextureRepeatMode shifts its result. Other bits are retained.
   */
  @meta.blue.method
  @meta.implemented
  SetTextureRepeatMode(value)
  {
    const rest = this._settings & ~(Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_MIRROR | Tr2Sprite2dTextureSettings.S2D_TS_REPEAT_CLAMP);
    this._settings = rest | value;
    this.SetDirty();
  }

  /** Returns the native source-rectangle x value. */
  @meta.blue.method
  @meta.implemented
  GetSrcX()
  {
    return this._srcX;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */
  @meta.blue.method
  @meta.implemented
  SetSrcX(value)
  {
    this._srcX = value;
    this.CheckTextureWindow();
    this.SetDirty();
  }

  /** Returns the native source-rectangle y value. */
  @meta.blue.method
  @meta.implemented
  GetSrcY()
  {
    return this._srcY;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */
  @meta.blue.method
  @meta.implemented
  SetSrcY(value)
  {
    this._srcY = value;
    this.CheckTextureWindow();
    this.SetDirty();
  }

  /** Returns the native source-rectangle width value. */
  @meta.blue.method
  @meta.implemented
  GetSrcWidth()
  {
    return this._srcWidth;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */
  @meta.blue.method
  @meta.implemented
  SetSrcWidth(value)
  {
    this._srcWidth = value;
    this.CheckTextureWindow();
    this.SetDirty();
  }

  /** Returns the native source-rectangle height value. */
  @meta.blue.method
  @meta.implemented
  GetSrcHeight()
  {
    return this._srcHeight;
  }

  /** Updates the native source rectangle and invalidates texture listeners. */
  @meta.blue.method
  @meta.implemented
  SetSrcHeight(value)
  {
    this._srcHeight = value;
    this.CheckTextureWindow();
    this.SetDirty();
  }

  /** Delegates native width to the atlas texture when present. */
  @meta.blue.method
  @meta.implemented
  GetWidth()
  {
    return this._atlasTexture ? this._atlasTexture.GetWidth() : 0;
  }

  /** Delegates native height to the atlas texture when present. */
  @meta.blue.method
  @meta.implemented
  GetHeight()
  {
    return this._atlasTexture ? this._atlasTexture.GetHeight() : 0;
  }

  /** Delegates native isloading to the atlas texture when present. */
  @meta.blue.method
  @meta.implemented
  IsLoading()
  {
    return this._atlasTexture ? this._atlasTexture.IsLoading() : false;
  }

  /** Delegates native isgood to the atlas texture when present. */
  @meta.blue.method
  @meta.implemented
  IsGood()
  {
    return this._atlasTexture ? this._atlasTexture.IsGood() : false;
  }

  /** Reads the native tile-x bit. */
  @meta.blue.method
  @meta.implemented
  GetTileX()
  {
    return (this._settings & Tr2Sprite2dTextureSettings.S2D_TS_TILE_X) !== 0;
  }

  /** Changes only the tile-x bit and notifies listeners. */
  @meta.blue.method
  @meta.implemented
  SetTileX(value)
  {
    if (value) this._settings |= Tr2Sprite2dTextureSettings.S2D_TS_TILE_X;
    else this._settings &= ~Tr2Sprite2dTextureSettings.S2D_TS_TILE_X;
    this.SetDirty();
  }

  /** Reads the native tile-y bit. */
  @meta.blue.method
  @meta.implemented
  GetTileY()
  {
    return (this._settings & Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y) !== 0;
  }

  /** Changes only the tile-y bit and notifies listeners. */
  @meta.blue.method
  @meta.implemented
  SetTileY(value)
  {
    if (value) this._settings |= Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y;
    else this._settings &= ~Tr2Sprite2dTextureSettings.S2D_TS_TILE_Y;
    this.SetDirty();
  }

  /** Native Blue resPath property. */
  @meta.blue.readwrite
  @meta.type.path
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
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2AtlasTexture")
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
  @meta.blue.readwrite
  @meta.type.int32
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
  @meta.blue.readwrite
  @meta.type.float32
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
  @meta.blue.readwrite
  @meta.type.float32
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
  @meta.blue.readwrite
  @meta.type.float32
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
  @meta.blue.readwrite
  @meta.type.float32
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
  @meta.blue.readwrite
  @meta.type.boolean
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
  @meta.blue.readwrite
  @meta.type.boolean
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
