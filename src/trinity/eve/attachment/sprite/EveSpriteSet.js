import { ITr2LightOwner } from "../../lights/ITr2LightOwner.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.cpp
import { EveEntity } from "../../EveEntity.js";
import { EveSpriteSetSpriteData } from "./EveSpriteSetSpriteData.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpriteLight } from "./EveSpriteLight.js";
import { EveSpriteSetItem } from "./EveSpriteSetItem.js";
import { EveComponentType } from "../../EntityComponents.js";
import { EveSpaceObjectAttachmentUtils } from "../EveSpaceObjectAttachmentUtils.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { LightFeatures } from "../../lights/LightFeatures.js";
import { TriBatchType } from "#consts/graphics";
import { num } from "#math/num";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// Carbon PoolVertex (EveSpriteSet.h:56-70): 32 bytes -
// position float3 @0; TEXCOORD0 half4 @12 = activation, blinkPhase,
// blinkRate, minScale; TEXCOORD1 half2 @20 = maxScale, falloff;
// COLOR0 @24; COLOR1 (warp) @28.
const POOL_VERTEX_SIZE = 32;

// Carbon PoolVertex::GetDefinition (EveSpriteSet.cpp:18-33), built the way
// Carbon builds it - through Tr2VertexDefinition.Add with its automatic
// per-stream offsets, which land exactly on the struct layout above.
const POOL_VERTEX_DEFINITION = new Tr2VertexDefinition();
POOL_VERTEX_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 5);
POOL_VERTEX_DEFINITION.Add("FLOAT32_3", "POSITION", 0, 1, 1);
POOL_VERTEX_DEFINITION.Add("FLOAT16_4", "TEXCOORD", 0, 1, 1);
POOL_VERTEX_DEFINITION.Add("FLOAT16_2", "TEXCOORD", 1, 1, 1);
POOL_VERTEX_DEFINITION.Add("UBYTE_4_NORM", "COLOR", 0, 1, 1);
POOL_VERTEX_DEFINITION.Add("UBYTE_4_NORM", "COLOR", 1, 1, 1);

/** One float colour channel as the byte Carbon's uint32 Color carries. */
function colorByte(value)
{
  return Math.min(255, Math.max(0, Math.round(Number(value) * 255))) | 0;
}


/**
 * A hull's authored blinking sprites, owning their static and per-bone bounds
 * and the point lights the sprites emit.
 */
@blue.define("EveSpriteSet")
@blue.inherit(IInitialize, ITr2LightOwner, EveEntity)
@blue.interface(IInitialize, IEveSpaceObjectAttachment, EveEntity, ITr2LightOwner)
export class EveSpriteSet extends IEveSpaceObjectAttachment
{

  @blue.notify
  @blue.read
  @blue.persist
  @type.list("EveSpriteSetItem")
  sprites = [];

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  effect = null;

  @blue.readwrite
  @blue.persist
  @type.boolean
  skinned = false;

  @blue.readwrite
  @blue.persist
  @type.float32
  intensity = 1;

  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  @meta.persist
  @type.list("EveSpriteLight")
  lights = [];

  _rebuildRevision = 0;

  /** m_aabb (h:140) - the union of every unskinned sprite's bounds. */
  _staticBounds = box3.create();

  /** m_boundingBoxes (h:142) - [{ boneIndex, bounds }], ascending. */
  _boneBounds = [];

  /** Carbon m_activationStrength (ctor default 0, EveSpriteSet.cpp:67 - NOT
   * 1: packed-set lights are BLACK until the owner's update calls
   * UpdateLights). */
  _activationStrength = 0;

  // Carbon m_effectHash / m_buffer / m_spriteData (h:126-134): the quad
  // renderer key and the persistent instance buffer Rebuild packs and the
  // submission paths mutate in place.
  _effectKey = 0;

  _poolBuffer = new Uint8Array(0);

  _poolView = null;

  _spriteData = [];

  static _positionScratch = vec3.create();

  static _boneScratch = mat4.create();

  /**
   * Drops every sprite and every light; the bounds only follow on the next
   * Rebuild.
   */
  @blue.method
  @meta.implemented
  Clear()
  {
    this.sprites.length = 0;
    this.lights.length = 0;
  }

  /** Carbon EveSpriteSet::UpdateLights (cpp:142-161): per light - only
   * boneIndex >= 0 takes the bone path (as Tr2Light::SetBoneMatrix's >= 0;
   * -1 is no bone): the Float4x3 bone is
   * unpacked column-stride, the 4th column zeroed with [15] = 1, then
   * boneMatrix *= parentTransform - Carbon row-vector, bone FIRST, so the
   * gl-matrix operands SWAP; otherwise boneMatrix = parentTransform. Stamps
   * the activation strength (boosterGain is accepted but unused by sprites).
   *
   * Adapted: Carbon skips bone 0 here (EveSpriteSet.cpp:146; CE-27), so a light on binding 0
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

  /**
   * Carbon's Add( EveSpriteSetItemPtr newItem ) (EveSpriteSet.h:80): appends a
   * ready-made item. Adapted: returns the item, which Carbon's void does not.
   * @param {EveSpriteSetItem} newItem
   * @returns {EveSpriteSetItem}
   */
  @blue.method
  @meta.adapted
  Add(newItem)
  {
    this.sprites.push(newItem);
    return newItem;
  }

  /**
   * Carbon's Add( pos, scale, color, warpColor ) (EveSpriteSet.h:79): a
   * non-blinking sprite of one scale. Named after scale, the parameter that
   * carries its meaning (docs 22d1237). Adapted: returns the new item.
   * @returns {EveSpriteSetItem}
   */
  @meta.adapted
  Add__Scale(pos, scale, color, warpColor)
  {
    return this._AddItem(pos, 0, 0, scale, scale, 0, color, warpColor);
  }

  /**
   * Carbon's Add( pos, blinkRate, blinkPhase, minScale, maxScale, falloff,
   * color, warpColor ) (EveSpriteSet.h:78): a blinking sprite. Named after the
   * blink parameters that carry its meaning. Adapted: returns the new item.
   * @returns {EveSpriteSetItem}
   */
  @meta.adapted
  Add__Blink(pos, blinkRate, blinkPhase, minScale, maxScale, falloff, color, warpColor)
  {
    return this._AddItem(pos, blinkRate, blinkPhase, minScale, maxScale, falloff, color, warpColor);
  }

  /** Builds and appends one item; the shared body of Add__Scale and Add__Blink. */
  _AddItem(pos, blinkRate, blinkPhase, minScale, maxScale, falloff, color, warpColor)
  {
    const item = new EveSpriteSetItem();
    vec3.copy(item.position, pos);
    item.blinkRate = Number(blinkRate);
    item.blinkPhase = Number(blinkPhase);
    item.minScale = Number(minScale);
    item.maxScale = Number(maxScale);
    item.falloff = Number(falloff);
    vec4.copy(item.color, color);
    vec4.copy(item.warpColor, warpColor);
    item.boneIndex = 0;
    this.sprites.push(item);
    return item;
  }

  /** The live sprite item list, not a copy. */
  @blue.method
  @meta.implemented
  GetSprites()
  {
    return this.sprites;
  }

  /** The authored set name, which SOF uses to match this set to its DNA entry. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored set name, coercing null or undefined to an empty string. */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** The effect that draws the sprites. */
  @blue.method
  @meta.implemented
  GetEffect()
  {
    return this.effect;
  }

  /** Sets the effect that draws the sprites. */
  @blue.method
  @meta.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /**
   * Sets whether the sprites ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */
  @blue.method
  @meta.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  /**
   * Recomputes the static and per-bone bounds from the authored sprites and
   * marks the packed geometry stale.
   */
  @blue.method
  @meta.implemented
  Rebuild()
  {
    this._rebuildRevision++;


    // Carbon Rebuild (cpp:300-343): refresh the effect key, pack every
    // authored sprite into the persistent PoolVertex buffer, mirror the
    // positions and bone indices, then the bounds. Carbon's colour packing
    // is a B/R byte swap of the uint32 ARGB Color (cpp:319-327) - which in
    // little-endian byte terms is simply r,g,b,a written in order.
    // `activation` (@12) stays zero: the submission paths stamp it per
    // frame (cpp:214-218 / cpp:109-121).
    if (this.effect)
    {
      this._effectKey = Number(this.effect.GetHashValue()) >>> 0;
    }

    const n = this.sprites.length;
    if (this._poolBuffer.length !== n * POOL_VERTEX_SIZE)
    {
      this._poolBuffer = new Uint8Array(n * POOL_VERTEX_SIZE);
      this._poolView = new DataView(this._poolBuffer.buffer);
    }
    this._spriteData.length = n;
    for (let i = 0; i < n; i++)
    {
      const sprite = this.sprites[i];
      const base = i * POOL_VERTEX_SIZE;
      const view = this._poolView;
      view.setFloat32(base, sprite.position[0], true);
      view.setFloat32(base + 4, sprite.position[1], true);
      view.setFloat32(base + 8, sprite.position[2], true);
      view.setUint16(base + 12, 0, true); // activation - per frame
      view.setUint16(base + 14, num.toHalfFloat(sprite.blinkPhase), true);
      view.setUint16(base + 16, num.toHalfFloat(sprite.blinkRate), true);
      view.setUint16(base + 18, num.toHalfFloat(sprite.minScale), true);
      view.setUint16(base + 20, num.toHalfFloat(sprite.maxScale), true);
      view.setUint16(base + 22, num.toHalfFloat(sprite.falloff), true);
      for (let c = 0; c < 4; c++)
      {
        this._poolBuffer[base + 24 + c] = colorByte(sprite.color[c]);
        this._poolBuffer[base + 28 + c] = colorByte(sprite.warpColor[c]);
      }
      // m_spriteData holds SpriteData by value (h:70-74): the position is copied.
      const data = this._spriteData[i] ?? (this._spriteData[i] = new EveSpriteSetSpriteData());
      vec3.copy(data.position, sprite.position);
      // uint32_t (EveSpriteSet.h:73): a negative index wraps and misses every bone.
      data.boneIndex = sprite.boneIndex >>> 0;
    }

    // Carbon rebuilds the item-set bounds at the tail of the same pack
    // (cpp:342).
    CreateItemSetBoundingBoxes(this._staticBounds, this._boneBounds, this.skinned, this.sprites);
  }

  /**
   * Carbon RegisterWithQuadRenderer (cpp:168-171): one additive-batch
   * registration keyed by the effect hash. RegisterEffect is
   * idempotent-by-key, so an effect-option change needs the key refreshed
   * (Rebuild does) and this called again - exactly Carbon's SetShaderOption
   * flow (cpp:430-438), whose singleton reach is not ported yet here.
   */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (!this.effect) return;
    this._effectKey = Number(this.effect.GetHashValue()) >>> 0;
    quadRenderer.RegisterEffect(
      this._effectKey,
      TriBatchType.TRIBATCHTYPE_ADDITIVE,
      POOL_VERTEX_SIZE,
      1,
      POOL_VERTEX_DEFINITION,
      this.effect
    );
  }

  /**
   * Carbon AddToQuadRenderer (cpp:173-219): move every sprite position into
   * world space (through its bone when skinned and the bone exists, else
   * directly), stamp activation * intensity as a half into every instance,
   * and hand the exact bytes to the quad renderer. boosterGain is accepted
   * and unused, as in Carbon.
   *
   * @param {object} quadRenderer Tr2QuadRenderer.
   * @param {Float32Array} parentTransform World matrix.
   * @param {number} activation Activation strength.
   * @param {number} _boosterGain Accepted for signature parity (cpp:174).
   * @param {Float32Array} [bones] Flat Float4x3 list, stride 12.
   * @param {number} [boneCount] Bones available.
   */
  @blue.method
  @meta.implemented
  AddToQuadRenderer(quadRenderer, parentTransform, activation, _boosterGain = 0, bones = null, boneCount = 0)
  {
    if (!this.display || this._spriteData.length === 0) return;

    const n = this._spriteData.length;
    if (!this.skinned || !bones)
    {
      this._TransformPositions(parentTransform);
    }
    else
    {
      const position = EveSpriteSet._positionScratch;
      const bone = EveSpriteSet._boneScratch;
      for (let i = 0; i < n; i++)
      {
        const data = this._spriteData[i];
        if (data.boneIndex < boneCount)
        {
          MatrixCopyFrom3x4(bone, bones, data.boneIndex);
          vec3.transformMat4(position, data.position, bone);
          vec3.transformMat4(position, position, parentTransform);
        }
        else
        {
          vec3.transformMat4(position, data.position, parentTransform);
        }
        this._WritePosition(i, position);
      }
    }

    const activation16 = num.toHalfFloat(Math.fround(activation * this.intensity));
    for (let i = 0; i < n; i++)
    {
      this._poolView.setUint16(i * POOL_VERTEX_SIZE + 12, activation16, true);
    }
    quadRenderer.AddQuads(this._effectKey, this._poolBuffer, this.sprites.length);
  }

  /**
   * Carbon AddBoosterGlowToQuadRenderer (cpp:83-124): world-transform the
   * positions, then repurpose the instance halves - activation/blinkRate/
   * falloff carry the world Z axis (transform[8..10], Carbon GetZ) - and
   * overwrite both colours' alpha bytes with the gains. The overwrites are
   * DESTRUCTIVE in the shared persistent buffer, exactly as Carbon's: a set
   * serves either path each frame, and whichever runs repacks it.
   */
  @blue.method
  @meta.implemented
  AddBoosterGlowToQuadRenderer(quadRenderer, world, boosterGain, warpIntensity)
  {
    if (!this.display || this._spriteData.length === 0) return;

    this._TransformPositions(world);

    const
      zDirX = num.toHalfFloat(world[8]),
      zDirY = num.toHalfFloat(world[9]),
      zDirZ = num.toHalfFloat(world[10]),
      gain = Math.min(Math.trunc(boosterGain * 255), 255),
      warp = Math.min(Math.trunc(warpIntensity * 255), 255);

    for (let i = 0; i < this._spriteData.length; i++)
    {
      const base = i * POOL_VERTEX_SIZE;
      this._poolView.setUint16(base + 12, zDirX, true); // activation slot
      this._poolView.setUint16(base + 16, zDirY, true); // blinkRate slot
      this._poolView.setUint16(base + 22, zDirZ, true); // falloff slot
      this._poolBuffer[base + 27] = gain;
      this._poolBuffer[base + 31] = warp;
    }
    quadRenderer.AddQuads(this._effectKey, this._poolBuffer, this.sprites.length);
  }

  /** Carbon PoolVertex::GetDefinition (cpp:18-33), the instance layout. */
  static getDefinition()
  {
    return POOL_VERTEX_DEFINITION;
  }

  /** Carbon sizeof( PoolVertex ): bytes per instance, shared with EveSpriteLineSet. */
  static poolVertexSize = POOL_VERTEX_SIZE;

  /** The unskinned XMVector3TransformCoordStream (cpp:184-191 / cpp:101-107). */
  _TransformPositions(transform)
  {
    const position = EveSpriteSet._positionScratch;
    for (let i = 0; i < this._spriteData.length; i++)
    {
      vec3.transformMat4(position, this._spriteData[i].position, transform);
      this._WritePosition(i, position);
    }
  }

  /** Writes one sprite position as three little-endian floats in the vertex pool. */
  _WritePosition(index, position)
  {
    const base = index * POOL_VERTEX_SIZE;
    this._poolView.setFloat32(base, position[0], true);
    this._poolView.setFloat32(base + 4, position[1], true);
    this._poolView.setFloat32(base + 8, position[2], true);
  }

  /** Carbon EveSpriteSet::GetAabb (cpp:163-166): the item-set bounds, with the
   * bone list forwarded only when the set is skinned. */
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

  /** Carbon EveSpriteSet::UpdateVisibility (cpp:130-140): an uninitialized set
   * is NOT visible; otherwise its bounds move into world space and take the
   * frustum box test. No LOD and no display gate - Carbon tests display at draw
   * time, not here. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpriteSet._aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return updateContext.GetFrustum().IsBoxVisible(aabb);
  }

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

  /** Carbon EveSpriteSet::RegisterComponents (cpp:445-452): LightOwner when
   * lights are authored. */
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

  /** Carbon EveSpriteSet::GetLights (cpp:454-469): parentBrightness =
   * activationStrength once before the loop; per light the point conversion
   * on the bone matrix, then Blink scales BOTH radius and innerRadius AFTER
   * conversion (cpp:464-466). No gates - registration covers presence. The
   * profile rides the record by reference (Carbon: GetTextureIndex() with NO
   * +1, unlike Tr2Light::AddLight - the asymmetry is moot by-reference but
   * recorded).
   *
   * Adapted: Profile-index packing is by-reference per lightConversion.js.
   */
  @blue.method
  @meta.adapted
  GetLights(lightManager)
  {
    const features = EveSpriteSet._features;
    features.parentBrightness = this._activationStrength;
    features.parentScale = 1;
    const quality = lightManager.GetCurrentSpaceSceneShadowQuality();
    const record = EveSpriteSet._lightRecord;

    for (const light of this.lights)
    {
      light.lightData.AsPerPointLightData(light.boneMatrix, features, quality, record);
      const blinkScale = EveSpaceObjectAttachmentUtils.blink(light.blinkRate, light.blinkPhase, light.minScale, light.maxScale);
      record.radius *= blinkScale;
      record.innerRadius *= blinkScale;
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager.AddLight(record);
    }
  }

  /**
   * Carbon EveSpriteSet::GetDebugOptions (cpp:345-350).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Sprite Sets");
    options.add("Sprite Sets Bounds");
    options.add("Sprite Sets Lights");
  }

  /**
   * Carbon EveSpriteSet::RenderDebugInfo (cpp:352-427): three independent
   * options.
   *
   * "Sprite Sets" draws a lit sphere of the sprite's maxScale at its position,
   * under its bone when it has one and the parent transform; a sprite whose
   * bone index is out of range is drawn red instead of cyan. Each sprite is
   * its own owner.
   *
   * "Sprite Sets Bounds" draws the item-set box in the parent space, and
   * "Sprite Sets Lights" draws each light twice, inner then outer radius
   * scaled by the light's current blink, owned by the light's sprite.
   * @param {ITr2DebugRenderer2} renderer
   * @param {mat4} parentTransform
   * @param {Float32Array|null} bones Packed Float4x3 bone matrices.
   * @param {number} boneCount
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, bones, boneCount)
  {
    if (renderer.HasOption(this, "Sprite Sets"))
    {
      for (const sprite of this.sprites)
      {
        const transform = mat4.copy(EveSpriteSet._debugTransform, parentTransform);
        const boneIndex = sprite.boneIndex;
        let color = Tr2DebugColor.create__ColorZFail(EveSpriteSet._debugSpriteColor, EveSpriteSet._debugSpriteZFailColor);
        if (boneIndex >= 0)
        {
          if (boneIndex < boneCount)
          {
            const boneTF = mat4.identity(EveSpriteSet._debugBone);
            MatrixCopyFrom3x4(boneTF, bones, boneIndex);
            // Carbon (row-vector): transform = boneTF * transform - the bone applies first.
            mat4.multiply(transform, transform, boneTF);
          }
          else
          {
            color = Tr2DebugColor.create__ColorZFail(EveSpriteSet._debugMissingBoneColor, EveSpriteSet._debugMissingBoneZFailColor);
          }
        }

        renderer.DrawSphere__TransformCenterRadius(
          Tr2DebugObjectReference.create__Object(sprite),
          transform,
          sprite.position,
          sprite.maxScale,
          6,
          ITr2DebugRenderer2.Effect.Lit,
          color);
      }
    }

    if (renderer.HasOption(this, "Sprite Sets Bounds"))
    {
      const aabb = this.GetAabb(EveSpriteSet._debugBounds, bones, boneCount);
      renderer.DrawBox__Transform(
        Tr2DebugObjectReference.create__Object(this),
        parentTransform,
        box3.$min(aabb),
        box3.$max(aabb),
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0xff00ff00));
    }

    if (renderer.HasOption(this, "Sprite Sets Lights"))
    {
      for (const l of this.lights)
      {
        const t = mat4.fromTranslation(EveSpriteSet._debugTransform, l.lightData.position);
        // Carbon (row-vector): TranslationMatrix( l.lightData.position ) * l.boneMatrix.
        mat4.multiply(t, l.boneMatrix, t);

        const c = vec4.copy(EveSpriteSet._debugLightColor, l.lightData.color);
        const blinkScale = EveSpaceObjectAttachmentUtils.blink(l.blinkRate, l.blinkPhase, l.minScale, l.maxScale);

        c[3] = 0.5;

        // Carbon quirk (cpp:408): `>` not `>=`, so an index equal to the
        // sprite count reads one past the end; reproduced as an undefined read.
        const sprite = l.index > this.sprites.length ? null : this.sprites[l.index];

        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(sprite),
          t,
          l.lightData.innerRadius * blinkScale,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));

        c[3] = 0.3;
        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(sprite),
          t,
          l.lightData.radius * blinkScale,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));
      }
    }
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static _aabbScratch = box3.create();

  static _features = new LightFeatures();

  static _lightRecord = CreateLightRecord();

  static _debugTransform = mat4.create();

  static _debugBone = mat4.create();

  static _debugBounds = box3.create();

  static _debugLightColor = vec4.create();

  /** Color( 0.0f, 0.7f, 0.9f, 0.5f ) / Color( 0.0f, 0.7f, 0.9f, 0.1f ) (cpp:360). */
  static _debugSpriteColor = vec4.fromValues(0.0, 0.7, 0.9, 0.5);

  static _debugSpriteZFailColor = vec4.fromValues(0.0, 0.7, 0.9, 0.1);

  /** Color( 0.9f, 0.2f, 0.2f, 0.5f ) / Color( 0.9f, 0.2f, 0.2f, 0.1f ) (cpp:371). */
  static _debugMissingBoneColor = vec4.fromValues(0.9, 0.2, 0.2, 0.5);

  static _debugMissingBoneZFailColor = vec4.fromValues(0.9, 0.2, 0.2, 0.1);

  /** Carbon EveSpriteSet::SpriteData (public, EveSpriteSet.h:70-74). */
  static SpriteData = EveSpriteSetSpriteData;
}

// EveSpriteSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
