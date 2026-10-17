import { ITr2LightOwner } from "../../lights/ITr2LightOwner.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSet.cpp
import { EveEntity } from "../../EveEntity.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { box3 } from "#math/box3";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpriteLight } from "./EveSpriteLight.js";
import { EveComponentType } from "../../EntityComponents.js";
import { EveSpaceObjectAttachmentUtils } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { LightFeatures } from "../../lights/LightFeatures.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { num } from "#math/num";
import { TriBatchType } from "#consts/graphics";
import { EveSpriteSet } from "./EveSpriteSet.js";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_TRANSFORM = mat4.create();
const DEBUG_BONE = mat4.create();
const DEBUG_LIGHT_COLOR = vec4.create();

/** Carbon's `Vector3 lastPos( 0.0, 0.0, 0.0 )` (cpp:281). */
const DEBUG_ORIGIN = vec3.fromValues(0, 0, 0);

/** Carbon's sprite line debug colours (cpp:265, cpp:276). */
const DEBUG_LINE_COLOR = vec4.fromValues(0.0, 0.7, 0.9, 0.5);
const DEBUG_LINE_ZFAIL_COLOR = vec4.fromValues(0.0, 0.7, 0.9, 0.1);
const DEBUG_MISSING_BONE_COLOR = vec4.fromValues(0.9, 0.2, 0.2, 0.5);
const DEBUG_MISSING_BONE_ZFAIL_COLOR = vec4.fromValues(0.9, 0.2, 0.2, 0.1);



/**
 * A hull's authored sprite runs - lines and circles of evenly spaced sprites -
 * owning their static and per-bone bounds and the point lights they emit.
 */
@blue.define("EveSpriteLineSet")
@blue.inherit(IInitialize, ITr2LightOwner, EveEntity)
@blue.interface(IInitialize, IEveSpaceObjectAttachment, EveEntity, ITr2LightOwner)
export class EveSpriteLineSet extends IEveSpaceObjectAttachment
{

  @blue.read
  @blue.persist
  @type.list("EveSpriteLineSetItem")
  spriteLines = [];

  @blue.readwrite
  @blue.persist
  @type.boolean
  skinned = false;

  @blue.read
  @type.uint32
  effectHash = 0;

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  effect = null;

  @blue.readwrite
  @type.boolean
  display = true;

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @meta.persist
  @type.list("EveSpriteLight")
  lights = [];

  _rebuildRevision = 0;

  /** m_buffer - one EveSpriteSet PoolVertex per sprite, packed bytes. */
  _buffer = new Uint8Array(0);

  /** A DataView over _buffer. */
  _view = new DataView(this._buffer.buffer);

  /** m_spriteData - { position, boneIndex } per sprite, in parent space. */
  _spriteData = [];

  /** m_aabb - the union of every unskinned sprite line (cpp:77). */
  _staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  _boneBounds = [];

  /** Carbon m_activationStrength (ctor default 0, EveSpriteLineSet.cpp:26 -
   * NOT 1: packed-set lights are BLACK until UpdateLights runs). */
  _activationStrength = 0;

  /** Carbon Rebuild (cpp:74-78): the packed sprites, then the bounds. */
  @blue.method
  @meta.implemented
  Rebuild()
  {
    this._rebuildRevision++;
    this.ReallocateResources();
    CreateItemSetBoundingBoxes(this._staticBounds, this._boneBounds, this.skinned, this.spriteLines);
  }

  /**
   * Carbon ReallocateResources (cpp:84-138): every line expands to its sprite
   * positions, each packed as an EveSpriteSet PoolVertex - the blink phase
   * stepping by blinkPhaseShift along the line, the warp colour the line's
   * colour, activation 1 - and mirrored with its bone index.
   *
   * @returns {boolean} True.
   */
  @blue.method
  @meta.implemented
  ReallocateResources()
  {
    if (this.effect) this.effectHash = Number(this.effect.GetHashValue()) >>> 0;

    const size = EveSpriteSet.poolVertexSize;
    const expanded = this.spriteLines.map(line => [ line, line.GetPositions() ]);
    const total = expanded.reduce((sum, [ , positions ]) => sum + positions.length, 0);

    this._buffer = new Uint8Array(total * size);
    this._view = new DataView(this._buffer.buffer);
    this._spriteData = [];

    const activation = num.toHalfFloat(1);
    let at = 0;
    for (const [ line, positions ] of expanded)
    {
      // Carbon's B/R swap of the uint32 Color, which is r,g,b,a as bytes.
      const color = [ 0, 1, 2, 3 ].map(c => Math.min(255, Math.max(0, Math.round(Number(line.color[c]) * 255))) | 0);
      positions.forEach((position, index) =>
      {
        const base = at * size;
        this._view.setFloat32(base, position[0], true);
        this._view.setFloat32(base + 4, position[1], true);
        this._view.setFloat32(base + 8, position[2], true);
        this._view.setUint16(base + 12, activation, true);
        this._view.setUint16(base + 14, num.toHalfFloat(line.blinkPhase + line.blinkPhaseShift * index), true);
        this._view.setUint16(base + 16, num.toHalfFloat(line.blinkRate), true);
        this._view.setUint16(base + 18, num.toHalfFloat(line.minScale), true);
        this._view.setUint16(base + 20, num.toHalfFloat(line.maxScale), true);
        this._view.setUint16(base + 22, num.toHalfFloat(line.falloff), true);
        this._buffer.set(color, base + 24);
        this._buffer.set(color, base + 28);
        this._spriteData.push({ position, boneIndex: line.boneIndex >>> 0 });
        at++;
      });
    }
    return true;
  }

  /** Carbon RegisterWithQuadRenderer (cpp:186-190): additive, one quad per sprite. */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    quadRenderer.RegisterEffect(this.effectHash, TriBatchType.TRIBATCHTYPE_ADDITIVE, EveSpriteSet.poolVertexSize, 1, EveSpriteSet.getDefinition(), this.effect);
  }

  /**
   * Carbon AddToQuadRenderer (cpp:192-239): sprite positions into world space,
   * through their bone when skinned and the bone exists; activation stamped
   * unscaled (unlike EveSpriteSet, no intensity).
   */
  @blue.method
  @meta.implemented
  AddToQuadRenderer(quadRenderer, parentTransform, activation, _boosterGain, bones, boneCount)
  {
    if (!this.display || !this._spriteData.length) return;

    const size = EveSpriteSet.poolVertexSize;
    const position = EveSpriteLineSet._positionScratch;
    const bone = EveSpriteLineSet._boneScratch;

    this._spriteData.forEach((data, index) =>
    {
      if (this.skinned && data.boneIndex < boneCount)
      {
        MatrixCopyFrom3x4(bone, bones, data.boneIndex);
        vec3.transformMat4(position, data.position, bone);
        vec3.transformMat4(position, position, parentTransform);
      }
      else
      {
        vec3.transformMat4(position, data.position, parentTransform);
      }
      const base = index * size;
      this._view.setFloat32(base, position[0], true);
      this._view.setFloat32(base + 4, position[1], true);
      this._view.setFloat32(base + 8, position[2], true);
    });

    const activation16 = num.toHalfFloat(activation);
    for (let index = 0; index < this._spriteData.length; index++)
    {
      this._view.setUint16(index * size + 12, activation16, true);
    }

    quadRenderer.AddQuads(this.effectHash, this._buffer, this._spriteData.length);
  }

  static _positionScratch = vec3.create();

  static _boneScratch = mat4.create();

  /**
   * Runs the first Rebuild so the set has bounds before its first visibility
   * test.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this.Rebuild();
    return true;
  }

  /** Carbon EveSpriteLineSet::GetAabb (cpp:177-180): the item-set bounds, with the bone
   * list forwarded only when the set is skinned. */
  @blue.method
  @meta.implemented
  GetAabb(out, bones = null, boneCount = 0)
  {
    return GetItemSetAabb(
      out,
      this._staticBounds,
      this._boneBounds,
      bones,
      this.skinned ? boneCount : 0
    );
  }

  /** Carbon EveSpriteLineSet::UpdateVisibility (cpp:140-150): an uninitialized set is
   * NOT visible; otherwise the bounds move into world space and take the
   * frustum box test. No LOD and no display gate. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpriteLineSet._aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return updateContext.GetFrustum().IsBoxVisible(aabb);
  }

  /** Sets the drawing effect and the skinned flag in one call. */
  @blue.method
  @meta.implemented
  Setup(effect, isSkinned)
  {
    this.effect = effect ?? null;
    this.skinned = !!isSkinned;
  }

  /**
   * Appends an authored sprite line item; the bounds only pick it up on the next
   * Rebuild.
   */
  @blue.method
  @meta.implemented
  Add(item)
  {
    this.spriteLines.push(item);
  }

  /**
   * Sets a shader option on the sprite line effect, doing nothing when no effect is attached.
   */
  @blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    if (this.effect)
    {
      this.effect.SetOption(name, value);
    }
  }

  /**
   * Carbon EveSpriteLineSet::GetDebugOptions (cpp:249-253).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Sprite Line Sets");
    options.add("Sprite Line Sets Lights");
  }

  /**
   * Carbon EveSpriteLineSet::RenderDebugInfo (cpp:255-341): two independent
   * options.
   *
   * "Sprite Line Sets" draws, for every sprite line, a lit sphere of maxScale
   * at each expanded sprite position and a lit cylinder of radius minScale / 2
   * joining each position to the one before, owned by the line. A line whose
   * bone index is out of range is drawn red instead of cyan.
   *
   * "Sprite Line Sets Lights" draws each light twice, inner then outer radius
   * scaled by the light's current blink, owned by the light's line.
   * @param {ITr2DebugRenderer2} renderer
   * @param {mat4} parentTransform
   * @param {Float32Array|null} bones Packed Float4x3 bone matrices.
   * @param {number} boneCount
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, bones, boneCount)
  {
    if (renderer.HasOption(this, "Sprite Line Sets"))
    {
      // Carbon quirk (cpp:259, cpp:272): the transform is declared once,
      // outside the line loop, so each skinned line's bone is composed onto
      // every earlier line's. Reproduced.
      const transform = mat4.copy(DEBUG_TRANSFORM, parentTransform);

      for (const spriteLine of this.spriteLines)
      {
        const boneIndex = spriteLine.boneIndex;

        let color = Tr2DebugColor.create__ColorZFail(DEBUG_LINE_COLOR, DEBUG_LINE_ZFAIL_COLOR);
        if (boneIndex >= 0)
        {
          if (boneIndex < boneCount)
          {
            const boneTF = mat4.identity(DEBUG_BONE);
            MatrixCopyFrom3x4(boneTF, bones, boneIndex);
            // Carbon (row-vector): transform = boneTF * transform - the bone applies first.
            mat4.multiply(transform, transform, boneTF);
          }
          else
          {
            color = Tr2DebugColor.create__ColorZFail(DEBUG_MISSING_BONE_COLOR, DEBUG_MISSING_BONE_ZFAIL_COLOR);
          }
        }

        let index = 0;
        let lastPos = DEBUG_ORIGIN;
        for (const position of spriteLine.GetPositions())
        {
          if (index !== 0)
          {
            renderer.DrawCylinder__TransformCaps(
              Tr2DebugObjectReference.create__Object(spriteLine),
              transform,
              lastPos,
              position,
              spriteLine.minScale / 2.0,
              8,
              ITr2DebugRenderer2.Effect.Lit,
              color);
          }
          index += 1;
          // GetPositions returns fresh vectors, so keeping the reference is Carbon's copy.
          lastPos = position;

          renderer.DrawSphere__TransformCenterRadius(
            Tr2DebugObjectReference.create__Object(spriteLine),
            transform,
            position,
            spriteLine.maxScale,
            6,
            ITr2DebugRenderer2.Effect.Lit,
            color);
        }
      }
    }

    if (renderer.HasOption(this, "Sprite Line Sets Lights"))
    {
      for (const l of this.lights)
      {
        const t = mat4.fromTranslation(DEBUG_TRANSFORM, l.lightData.position);
        // Carbon (row-vector): TranslationMatrix( l.lightData.position ) * l.boneMatrix.
        mat4.multiply(t, l.boneMatrix, t);

        const c = vec4.copy(DEBUG_LIGHT_COLOR, l.lightData.color);
        const blinkScale = EveSpaceObjectAttachmentUtils.blink(Tr2Renderer.GetAnimationTime(), l.blinkRate, l.blinkPhase, l.minScale, l.maxScale);

        c[3] = 0.5;

        // Carbon quirk (cpp:322): `>` not `>=`, so an index equal to the line
        // count reads one past the end; reproduced as an undefined read.
        const spriteLine = l.index > this.spriteLines.length ? null : this.spriteLines[l.index];

        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(spriteLine),
          t,
          l.lightData.innerRadius * blinkScale,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));

        c[3] = 0.3;
        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(spriteLine),
          t,
          l.lightData.radius * blinkScale,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));
      }
    }
  }

  /**
   * Converts a SOF-authored light description into an EveSpriteLight and appends
   * it to the set.
   */
  @blue.method
  @meta.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveSpriteLight.FromSOF(light));
  }

  /** Carbon EveSpriteLineSet::RegisterComponents (cpp:349-356): LightOwner
   * when lights are authored. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.lights.length)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /** Carbon EveSpriteLineSet::UpdateLights (cpp:152-171): byte-identical to
   * EveSpriteSet's - boneIndex >= 0 (-1 is no bone), column-stride Float4x3 unpack, 4th column zeroed with [15] = 1,
   * then boneMatrix *= parentTransform - Carbon row-vector, bone FIRST: the
   * gl-matrix operands SWAP; else boneMatrix = parentTransform. Stamps the
   * activation strength (boosterGain unused).
   *
   * Adapted: Carbon skips bone 0 here (EveSpriteLineSet.cpp:156; CE-27), so a light on binding 0
   * gets only the parent transform. Binding 0 is a mesh bone binding and can
   * be animated - the Bowhead (orecs2_t1) moves its MASTER binding through
   * Normal2Warp - so ours applies bone 0 like any other. */
  @blue.method
  @meta.adapted
  UpdateLights(parentTransform, bones, boneCount, activationStrength, _boosterGain = 0)
  {
    for (const light of this.lights)
    {
      const boneIndex = light.lightData.boneIndex;
      if (bones && boneIndex >= 0 && boneIndex < boneCount)
      {
        MatrixCopyFrom3x4(light.boneMatrix, bones, boneIndex);
        light.boneMatrix[3] = 0;
        light.boneMatrix[7] = 0;
        light.boneMatrix[11] = 0;
        light.boneMatrix[15] = 1;
        // Carbon (row-vector): boneMatrix * parentTransform - bone first.
        mat4.multiply(light.boneMatrix, parentTransform, light.boneMatrix);
      }
      else
      {
        mat4.copy(light.boneMatrix, parentTransform);
      }
    }
    this._activationStrength = Number(activationStrength) || 0;
  }

  /** Carbon EveSpriteLineSet::GetLights (cpp:358-373): byte-identical to
   * EveSpriteSet's (shared EveSpriteLight items) - point conversion on the
   * bone matrix, Blink scales radius + innerRadius after conversion, no
   * gates.
   *
   * Adapted: Profile-index packing is by-reference per lightConversion.js.
   */
  @blue.method
  @meta.adapted
  GetLights(lightManager)
  {
    const features = EveSpriteLineSet._features;
    features.parentBrightness = this._activationStrength;
    features.parentScale = 1;
    const time = Tr2Renderer.GetAnimationTime();
    const quality = lightManager.GetCurrentSpaceSceneShadowQuality();
    const record = EveSpriteLineSet._lightRecord;

    for (const light of this.lights)
    {
      light.lightData.AsPerPointLightData(light.boneMatrix, features, quality, record);
      const blinkScale = EveSpaceObjectAttachmentUtils.blink(time, light.blinkRate, light.blinkPhase, light.minScale, light.maxScale);
      record.radius *= blinkScale;
      record.innerRadius *= blinkScale;
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager.AddLight(record);
    }
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static _aabbScratch = box3.create();

  static _features = new LightFeatures();

  static _lightRecord = CreateLightRecord();
}

// EveSpriteLineSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
