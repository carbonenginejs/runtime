// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dContainer.cpp
// Hand-maintained Sprite2D traversal, picking and cache policy.
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { meta } from "#schema";
import { Tr2Sprite2dContainerBase } from "./Tr2Sprite2dContainerBase.js";

/** Defines a pickable 2D sprite container with clipping, depth range, coordinate mode, and optional content caching. */
@meta.define({ className: "Tr2Sprite2dContainer", family: "sprite2d", purpose: "Defines a pickable 2D sprite container with clipping, depth range, coordinate mode, and optional content caching." })
@meta.blue.chainTo(Tr2Sprite2dContainerBase)
export class Tr2Sprite2dContainer extends Tr2Sprite2dContainerBase
{

  /** m_clip (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  clip = false;

  /** m_cacheContents (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  isCachingContents = true;

  /** m_depthMax (float) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  depthMax = 1;

  /** m_depthMin (float) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  depthMin = -1;

  /** m_pickRadius (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  pickRadius = 0;

  /** m_cacheContentsHint (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  cacheContents = false;

  /** m_absoluteCoordinates (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  absoluteCoordinates = false;

  _dirtyFrameCount = 0;

  _cleanFrameCount = 0;

  _cachedDisplayList = null;

  /**
   * Carbon ~Tr2Sprite2dContainer: releases the cached display list, then the base
   * destructor detaches the children.
   *
   * Adapted: JS has no destructors, so the destructor bodies run from an explicit
   * Destroy, derived first and then the base, as C++ orders them.
   *
   * @returns {void}
   */
  @meta.adapted
  Destroy()
  {
    this._cachedDisplayList?.Destroy();
    this._cachedDisplayList = null;

    super.Destroy();
  }

  /** Applies Carbon's dirty/clean-frame cache policy before gathering or replaying. */
  @meta.implemented
  GatherSprites(renderer)
  {
    if (!this.display || (!this.children.length && !this.background.length)) return;

    if (this.displayWidth <= 0 || this.displayHeight <= 0) return;

    if (this.cacheContents)
    {
      if (this.isDirty)
      {
        this._cleanFrameCount = 0;
        if (this._dirtyFrameCount > 10)
        {
          this.isCachingContents = false;
          this._cachedDisplayList?.Destroy();
          this._cachedDisplayList = null;
        }
        else this._dirtyFrameCount++;
      }
      else
      {
        this._dirtyFrameCount = 0;
        if (this._cleanFrameCount > 3) this.isCachingContents = true;
        else this._cleanFrameCount++;
      }
    }
    else
    {
      this._dirtyFrameCount = this._cleanFrameCount = 0;
      this.isCachingContents = false;
      this._cachedDisplayList?.Destroy();
      this._cachedDisplayList = null;
    }

    if (this.isCachingContents && !renderer.IsCapturing())
    {
      if (this.isDirty || !this._cachedDisplayList)
      {
        const previous = this._cachedDisplayList;
        this._cachedDisplayList = null;
        const capturing = renderer.StartCapture(this);
        this._GatherSpritesHelper(renderer);

        if (capturing)
        {
          this._cachedDisplayList = renderer.EndCapture(previous);
          this.isDirty = false;
        }
        previous?.Destroy();
      }

      if (this._cachedDisplayList) renderer.ReplayCapture(this._cachedDisplayList);
    }
    else
    {
      this._GatherSpritesHelper(renderer);
      this.isDirty = false;
    }
  }

  /** Traverses nested content with translation, depth, opacity and optional clipping. */
  @meta.implemented
  _GatherSpritesHelper(renderer)
  {
    if (this.absoluteCoordinates) renderer.PushTransformAbsolute();

    renderer.PushTranslation([this.displayX, this.displayY]);
    renderer.PushDepthRange(this.depthMin, this.depthMax);
    const oldOpacity = renderer.GetAccumulatedAlpha();
    renderer.SetAccumulatedAlpha(this.opacity * oldOpacity);

    if (this.clip) renderer.PushClipRectangle(0, 0, this.displayWidth, this.displayHeight);

    for (let index = this.background.length - 1; index >= 0; index--)
    {
      this.background[index].GatherSprites(renderer);
    }

    for (let index = this.children.length - 1; index >= 0; index--)
    {
      this.children[index].GatherSprites(renderer);
    }

    if (this.clip) renderer.PopClipRectangle();

    renderer.SetAccumulatedAlpha(oldOpacity);
    renderer.PopDepthRange();
    renderer.PopTranslation();

    if (this.absoluteCoordinates) renderer.PopTransformAbsolute();
  }

  /** Picks visible children through native bounds, mask and clipping gates. */
  @meta.implemented
  PickPoint(x, y, renderer)
  {
    if (!this.display || this.pickState === Tr2SpriteObjectPickState.TR2_SPS_OFF) return null;

    if (this.displayWidth <= 0 || this.displayHeight <= 0) return null;

    let object = null;
    if (this.absoluteCoordinates) renderer.PushTransformAbsolute();

    renderer.PushTranslation([this.displayX, this.displayY]);
    const point = [x, y], origin = [0, 0];

    if (renderer.IsInside(point, origin, this.displayWidth, this.displayHeight, this.pickRadius)
      && (!this.pickingMask || this.pickingMask.SampleMask(renderer.InverseTransformPoint(point), origin, this.displayWidth, this.displayHeight)))
    {
      if (this.clip) renderer.PushClipRectangle(0, 0, this.displayWidth, this.displayHeight);

      for (const child of this.children)
      {
        object = child.PickPoint(x, y, renderer);
        if (object) break;
      }

      if (this.clip) renderer.PopClipRectangle();

      if (this.pickState === Tr2SpriteObjectPickState.TR2_SPS_ON)
      {
        this.auxMouseover = null;
        if (!object) object = this;
        else if (object.IsAuxMouseover())
        {
          this.auxMouseover = object;
          object = this;
        }
      }
    }

    renderer.PopTranslation();
    if (this.absoluteCoordinates) renderer.PopTransformAbsolute();

    return object;
  }

}
