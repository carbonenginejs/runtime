import { EveEntity } from "../../EveEntity.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteLineSet.cpp
import { box3 } from "#math/box3";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { mat4 } from "#math/mat4";
import { carbon, edit, impl, type } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpriteLight } from "./EveSpriteLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Blink } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { AsPerPointLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { vec3 } from "#math/vec3";
import { num } from "#math/num";
import { TriBatchType } from "#consts/graphics";
import { EveSpriteSet } from "./EveSpriteSet.js";


/**
 * A hull's authored sprite runs - lines and circles of evenly spaced sprites -
 * owning their static and per-bone bounds and the point lights they emit.
 */
@type.define({ className: "EveSpriteLineSet", family: "eve/attachment/sprites" })
@carbon.inherit(IInitialize)
export class EveSpriteLineSet extends IEveSpaceObjectAttachment
{

  @edit.read
  @edit.persist
  @type.list("EveSpriteLineSetItem")
  spriteLines = [];

  @edit.readwrite
  @edit.persist
  @type.boolean
  skinned = false;

  @edit.read
  @type.uint32
  effectHash = 0;

  @edit.readwrite
  @edit.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @edit.readwrite
  @type.boolean
  display = true;

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.persist
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    quadRenderer.RegisterEffect(this.effectHash, TriBatchType.TRIBATCHTYPE_ADDITIVE, EveSpriteSet.poolVertexSize, 1, EveSpriteSet.getDefinition(), this.effect);
  }

  /**
   * Carbon AddToQuadRenderer (cpp:192-239): sprite positions into world space,
   * through their bone when skinned and the bone exists; activation stamped
   * unscaled (unlike EveSpriteSet, no intensity).
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.Rebuild();
    return true;
  }

  /** Carbon EveSpriteLineSet::GetAabb (cpp:177-180): the item-set bounds, with the bone
   * list forwarded only when the set is skinned. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpriteLineSet._aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum()?.IsBoxVisible(aabb);
  }

  /** Sets the drawing effect and the skinned flag in one call. */
  @carbon.method
  @impl.implemented
  Setup(effect, isSkinned)
  {
    this.effect = effect ?? null;
    this.skinned = !!isSkinned;
  }

  /**
   * Appends an authored sprite line item; the bounds only pick it up on the next
   * Rebuild.
   */
  @carbon.method
  @impl.implemented
  Add(item)
  {
    this.spriteLines.push(item);
  }

  /**
   * Sets a shader option on the sprite line effect, doing nothing when no effect
   * that accepts options is attached.
   */
  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (this.effect && typeof this.effect.SetOption === "function")
    {
      this.effect.SetOption(name, value);
    }
  }

  /**
   * Converts a SOF-authored light description into an EveSpriteLight and appends
   * it to the set.
   */
  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveSpriteLight.FromSOF(light));
  }

  /** Carbon EveSpriteLineSet::RegisterComponents (cpp:349-356): LightOwner
   * when lights are authored. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.lights.length)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /** Carbon EveSpriteLineSet::UpdateLights (cpp:152-171): byte-identical to
   * EveSpriteSet's - boneIndex > 0 only (bone 0 never drives a packed-set
   * light), column-stride Float4x3 unpack, 4th column zeroed with [15] = 1,
   * then boneMatrix *= parentTransform - Carbon row-vector, bone FIRST: the
   * gl-matrix operands SWAP; else boneMatrix = parentTransform. Stamps the
   * activation strength (boosterGain unused). */
  @carbon.method
  @impl.implemented
  UpdateLights(parentTransform, bones, boneCount, activationStrength, _boosterGain = 0)
  {
    for (const light of this.lights)
    {
      const boneIndex = light.lightData.boneIndex;
      if (bones && boneIndex > 0 && boneIndex < boneCount)
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
   * gates. */
  @carbon.method
  @impl.adapted
  @impl.reason("profile-index packing is by-reference per lightConversion.js.")
  GetLights(lightManager)
  {
    const features = EveSpriteLineSet._features;
    features.parentBrightness = this._activationStrength;
    features.parentScale = 1;
    const time = Tr2Renderer.GetAnimationTime();
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EveSpriteLineSet._lightRecord;

    for (const light of this.lights)
    {
      AsPerPointLightData(record, light.lightData, light.boneMatrix, features, quality);
      const blinkScale = Blink(time, light.blinkRate, light.blinkPhase, light.minScale, light.maxScale);
      record.radius *= blinkScale;
      record.innerRadius *= blinkScale;
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager?.AddLight(record);
    }
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static _aabbScratch = box3.create();

  static _features = { parentBrightness: 0, parentScale: 1 };

  static _lightRecord = CreateLightRecord();
}

// EveSpriteLineSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
carbon.interfaceTable({ interfaces: [EveSpriteLineSet, IInitialize, IEveSpaceObjectAttachment, EveEntity], chainTo: null })(EveSpriteLineSet, { kind: "class" });
