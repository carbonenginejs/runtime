import { exposure as be } from "#be";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2d.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2d.cpp
import { meta, type, blue } from "#schema";
import { Tr2Sprite2dD3DVertex } from "./Tr2Sprite2dD3DVertex.js";
import { Tr2SpriteObjectPickState, Tr2SpriteObjectEffect } from "../generated/sprite2d/enums.js";
import { INotify } from "#blue";
import { Tr2TexturedSpriteObject } from "./Tr2TexturedSpriteObject.js";

const spriteIndices = new Uint16Array([0, 1, 3, 3, 1, 2, 4, 5, 7, 7, 5, 6, 8, 9, 11, 11, 9, 10]); // alloc: immutable module-level triangle index table

/** Prepares and gathers sprite quads through the native Sprite2D renderer contract. */
@blue.define({ className: "Tr2Sprite2d", purpose: "Adds opacity, saturation, texture-sized dimensions, and picking radius to a textured 2D sprite." })
@blue.interface(INotify)
@blue.chainTo(Tr2TexturedSpriteObject)
export class Tr2Sprite2d extends Tr2TexturedSpriteObject
{

  /** m_effectOpacity (float) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  effectOpacity = 1;

  /** m_useSizeFromTexture (bool) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.boolean
  useSizeFromTexture = false;

  /** m_pickRadius (float) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.float32
  pickRadius = 0;

  /** m_saturation (float) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.float32
  saturation = 1;


  /** Shadow, base and glow vertex storage, in native segment order. */
  _vertices = Array.from({ length: 12 }, () => new Tr2Sprite2dD3DVertex());

  /** First segment submitted after preparation. @type {number} */
  _firstVertex = 0;

  /**
   * Prepares dirty geometry, then reapplies textures and submits cached quads.
   * Adapted: Array slices replace native pointers; indices stay relative to the slice.
   */
  @meta.adapted
  @blue.method
  GatherSprites(renderer)
  {
    const effects = Tr2SpriteObjectEffect;
    if (!this.display || this.spriteEffect === effects.TR2_SFX_NONE) return;

    if (this.isDirty)
    {
      if (!this._ValidateAndSetTextures(renderer)) return;

      this._firstVertex = 4;
      this._vertexCount = 4;
      renderer.SetSpriteEffect(this.spriteEffect);
      let width = this.displayWidth, height = this.displayHeight;
      if (this.useSizeFromTexture)
      {
        width = this.texturePrimary.GetSrcWidth();
        if (width === 0) width = this.texturePrimary.GetWidth();
        height = this.texturePrimary.GetSrcHeight();
        if (height === 0) height = this.texturePrimary.GetHeight();
      }

      if (this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0)
      {
        this._firstVertex = 0;
        this._vertexCount += 4;
        this._SetShadowRenderState(renderer);
        renderer.PrepareSpriteVerts(this._vertices.slice(0, 4), [this.displayX + this.shadowOffset[0], this.displayY + this.shadowOffset[1]], width, height, this.spriteEffect);
      }

      this._SetRegularRenderState(renderer);
      if (this.spriteEffect === effects.TR2_SFX_OUTLINE) this._SetOutlineRenderState(renderer);

      renderer.PrepareSpriteVerts(this._vertices.slice(4, 8), [this.displayX, this.displayY], width, height, this.spriteEffect);
      if (this.spriteEffect < effects.TR2_SFX_TWO_TEXTURES && this.spriteEffect !== effects.TR2_SFX_BLUR && this.spriteEffect !== effects.TR2_SFX_GLOW && this.spriteEffect !== effects.TR2_SFX_OUTLINE)
      {
        for (let i = 4; i < 8; i++)
        {
          this._vertices[i].texCoord[1][0] = this.saturation;
          this._vertices[i].texCoord[1][1] = this.effectOpacity;
        }
      }

      if (this.glowFactor !== 0 || this.glowExpand !== 0)
      {
        this._vertexCount += 4;
        this._SetGlowRenderState(renderer);
        const offset = this.glowExpand;
        renderer.PrepareSpriteVerts(this._vertices.slice(8, 12), [this.displayX - offset, this.displayY - offset], width + offset * 2, height + offset * 2, this.spriteEffect);
      }

      // Native GatherSprites also clears dirty after PrepareSpriteVerts returns false.
      this.isDirty = false;
    }

    this._SetValidatedTextures(renderer);
    renderer.RenderTriangleVerts(this._vertices.slice(this._firstVertex, this._firstVertex + this._vertexCount), this._vertexCount, spriteIndices, this._vertexCount / 4 * 6);
  }

  /** Number of vertices prepared by the most recent gather. @type {number} */
  _vertexCount = 0;

  /** Tests authored dimensions and the optional mask in the active transform. */
  @meta.implemented
  @blue.method
  PickPoint(x, y, renderer)
  {
    if (!this.display || this.pickState !== Tr2SpriteObjectPickState.TR2_SPS_ON) return null;

    const point = [x, y], translation = [this.displayX, this.displayY];
    if (!renderer.IsInside(point, translation, this.displayWidth, this.displayHeight, this.pickRadius)) return null;

    if (this.pickingMask && !this.pickingMask.SampleMask(renderer.InverseTransformPoint(point), translation, this.displayWidth, this.displayHeight)) return null;

    return this;
  }

  /** Budgets a quad plus optional shadow and glow quads before gathering. */
  @meta.implemented
  @blue.method
  GetVertexCount()
  {
    if (!this.display) return 0;
    if (!this.isDirty) return this._vertexCount;

    let count = 4;
    if (this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0) count += 4;
    if (this.glowFactor !== 0 || this.glowExpand !== 0) count += 4;

    return count;
  }
}
