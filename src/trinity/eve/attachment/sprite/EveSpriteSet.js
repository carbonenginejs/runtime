// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpriteLight } from "./EveSpriteLight.js";
import { EveSpriteSetItem } from "./EveSpriteSetItem.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Blink } from "../EveSpaceObjectAttachmentUtils.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { AsPerPointLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { TriBatchType } from "#consts/graphics";
import { num } from "#math/num";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition.js";

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
@type.define({ className: "EveSpriteSet", family: "eve/attachment/sprites" })
export class EveSpriteSet extends IEveSpaceObjectAttachment
{
  @io.rebuild("packedGeometry")
  @io.notify
  @io.persist
  @type.list("EveSpriteSetItem")
  sprites = [];

  @io.persist
  @type.string
  name = "";

  @io.rebuild("packedGeometry")
  @io.notify
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.boolean
  skinned = false;

  @io.persist
  @type.float32
  intensity = 1;

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.list("EveSpriteLight")
  lights = [];

  #rebuildRevision = 0;

  /** m_aabb (h:140) - the union of every unskinned sprite's bounds. */
  #staticBounds = box3.create();

  /** m_boundingBoxes (h:142) - [{ boneIndex, bounds }], ascending. */
  #boneBounds = [];

  /** Carbon m_activationStrength (ctor default 0, EveSpriteSet.cpp:67 - NOT
   * 1: packed-set lights are BLACK until the owner's update calls
   * UpdateLights). */
  #activationStrength = 0;

  // Carbon m_effectHash / m_buffer / m_spriteData (h:126-134): the quad
  // renderer key and the persistent instance buffer Rebuild packs and the
  // submission paths mutate in place.
  #effectKey = 0;

  #poolBuffer = new Uint8Array(0);

  #poolView = null;

  #spriteData = [];

  static #positionScratch = vec3.create();

  static #boneScratch = mat4.create();

  /**
   * Drops every sprite and every light; the bounds only follow on the next
   * Rebuild.
   */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this.sprites.length = 0;
    this.lights.length = 0;
  }

  /** Carbon EveSpriteSet::UpdateLights (cpp:142-161): per light - only
   * boneIndex > 0 takes the bone path (bone 0 can NEVER drive a packed-set
   * light; contrast Tr2Light::SetBoneMatrix's >= 0): the Float4x3 bone is
   * unpacked column-stride, the 4th column zeroed with [15] = 1, then
   * boneMatrix *= parentTransform - Carbon row-vector, bone FIRST, so the
   * gl-matrix operands SWAP; otherwise boneMatrix = parentTransform. Stamps
   * the activation strength (boosterGain is accepted but unused by sprites). */
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
    this.#activationStrength = Number(activationStrength) || 0;
  }

  /**
   * Appends a sprite and returns the stored item, accepting either a ready-made item on its own or a position plus one of two argument forms.
   * @param {object|vec3} positionOrItem An existing sprite item, or the sprite position.
   * @param {...*} args Either (scale, color, warpColor) for a non-blinking sprite, or (blinkRate, blinkPhase, minScale, maxScale, falloff, color, warpColor).
   */
  @carbon.method
  @impl.adapted
  Add(positionOrItem, ...args)
  {
    if (positionOrItem && !ArrayBuffer.isView(positionOrItem) && !Array.isArray(positionOrItem) && args.length === 0)
    {
      this.sprites.push(positionOrItem);
      return positionOrItem;
    }

    const item = new EveSpriteSetItem();
    vec3.copy(item.position, positionOrItem ?? vec3.create());
    if (args.length === 3)
    {
      const [scale, color, warpColor] = args;
      item.blinkRate = 0;
      item.blinkPhase = 0;
      item.minScale = Number(scale);
      item.maxScale = Number(scale);
      item.falloff = 0;
      vec4.copy(item.color, color);
      vec4.copy(item.warpColor, warpColor);
    }
    else
    {
      const [blinkRate = 0, blinkPhase = 0, minScale = 1, maxScale = 1, falloff = 0, color = [1, 1, 1, 1], warpColor = [1, 1, 1, 1]] = args;
      item.blinkRate = Number(blinkRate);
      item.blinkPhase = Number(blinkPhase);
      item.minScale = Number(minScale);
      item.maxScale = Number(maxScale);
      item.falloff = Number(falloff);
      vec4.copy(item.color, color);
      vec4.copy(item.warpColor, warpColor);
    }
    item.boneIndex = 0;
    this.sprites.push(item);
    return item;
  }

  /** The live sprite item list, not a copy. */
  @carbon.method
  @impl.implemented
  GetSprites()
  {
    return this.sprites;
  }

  /** The authored set name, which SOF uses to match this set to its DNA entry. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored set name, coercing null or undefined to an empty string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** The effect that draws the sprites. */
  @carbon.method
  @impl.implemented
  GetEffect()
  {
    return this.effect;
  }

  /** Sets the effect that draws the sprites. */
  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /**
   * Sets whether the sprites ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */
  @carbon.method
  @impl.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  /**
   * Recomputes the static and per-bone bounds from the authored sprites and
   * marks the packed geometry stale.
   */
  @carbon.method
  @impl.implemented
  Rebuild()
  {
    this.#rebuildRevision++;
    this.__state.rebuild.add("packedGeometry");

    // Carbon Rebuild (cpp:300-343): refresh the effect key, pack every
    // authored sprite into the persistent PoolVertex buffer, mirror the
    // positions and bone indices, then the bounds. Carbon's colour packing
    // is a B/R byte swap of the uint32 ARGB Color (cpp:319-327) - which in
    // little-endian byte terms is simply r,g,b,a written in order.
    // `activation` (@12) stays zero: the submission paths stamp it per
    // frame (cpp:214-218 / cpp:109-121).
    if (this.effect)
    {
      this.#effectKey = Number(this.effect.GetHashValue()) >>> 0;
    }

    const n = this.sprites.length;
    if (this.#poolBuffer.length !== n * POOL_VERTEX_SIZE)
    {
      this.#poolBuffer = new Uint8Array(n * POOL_VERTEX_SIZE);
      this.#poolView = new DataView(this.#poolBuffer.buffer);
    }
    this.#spriteData.length = n;
    for (let i = 0; i < n; i++)
    {
      const sprite = this.sprites[i];
      const base = i * POOL_VERTEX_SIZE;
      const view = this.#poolView;
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
        this.#poolBuffer[base + 24 + c] = colorByte(sprite.color[c]);
        this.#poolBuffer[base + 28 + c] = colorByte(sprite.warpColor[c]);
      }
      this.#spriteData[i] = {
        position: sprite.position,
        boneIndex: sprite.boneIndex | 0
      };
    }

    // Carbon rebuilds the item-set bounds at the tail of the same pack
    // (cpp:342).
    CreateItemSetBoundingBoxes(this.#staticBounds, this.#boneBounds, this.skinned, this.sprites);
  }

  /**
   * Carbon RegisterWithQuadRenderer (cpp:168-171): one additive-batch
   * registration keyed by the effect hash. RegisterEffect is
   * idempotent-by-key, so an effect-option change needs the key refreshed
   * (Rebuild does) and this called again - exactly Carbon's SetShaderOption
   * flow (cpp:430-438), whose singleton reach is engine-owned here.
   */
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (!this.effect) return;
    this.#effectKey = Number(this.effect.GetHashValue()) >>> 0;
    quadRenderer.RegisterEffect(
      this.#effectKey,
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
  @carbon.method
  @impl.implemented
  AddToQuadRenderer(quadRenderer, parentTransform, activation, _boosterGain = 0, bones = null, boneCount = 0)
  {
    if (!this.display || this.#spriteData.length === 0) return;

    const n = this.#spriteData.length;
    if (!this.skinned || !bones)
    {
      this.#TransformPositions(parentTransform);
    }
    else
    {
      const position = EveSpriteSet.#positionScratch;
      const bone = EveSpriteSet.#boneScratch;
      for (let i = 0; i < n; i++)
      {
        const data = this.#spriteData[i];
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
        this.#WritePosition(i, position);
      }
    }

    const activation16 = num.toHalfFloat(Math.fround(activation * this.intensity));
    for (let i = 0; i < n; i++)
    {
      this.#poolView.setUint16(i * POOL_VERTEX_SIZE + 12, activation16, true);
    }
    quadRenderer.AddQuads(this.#effectKey, this.#poolBuffer, this.sprites.length);
  }

  /**
   * Carbon AddBoosterGlowToQuadRenderer (cpp:83-124): world-transform the
   * positions, then repurpose the instance halves - activation/blinkRate/
   * falloff carry the world Z axis (transform[8..10], Carbon GetZ) - and
   * overwrite both colours' alpha bytes with the gains. The overwrites are
   * DESTRUCTIVE in the shared persistent buffer, exactly as Carbon's: a set
   * serves either path each frame, and whichever runs repacks it.
   */
  @carbon.method
  @impl.implemented
  AddBoosterGlowToQuadRenderer(quadRenderer, world, boosterGain, warpIntensity)
  {
    if (!this.display || this.#spriteData.length === 0) return;

    this.#TransformPositions(world);

    const
      zDirX = num.toHalfFloat(world[8]),
      zDirY = num.toHalfFloat(world[9]),
      zDirZ = num.toHalfFloat(world[10]),
      gain = Math.min(Math.trunc(boosterGain * 255), 255),
      warp = Math.min(Math.trunc(warpIntensity * 255), 255);

    for (let i = 0; i < this.#spriteData.length; i++)
    {
      const base = i * POOL_VERTEX_SIZE;
      this.#poolView.setUint16(base + 12, zDirX, true); // activation slot
      this.#poolView.setUint16(base + 16, zDirY, true); // blinkRate slot
      this.#poolView.setUint16(base + 22, zDirZ, true); // falloff slot
      this.#poolBuffer[base + 27] = gain;
      this.#poolBuffer[base + 31] = warp;
    }
    quadRenderer.AddQuads(this.#effectKey, this.#poolBuffer, this.sprites.length);
  }

  /** Carbon PoolVertex::GetDefinition (cpp:18-33), the instance layout. */
  static getDefinition()
  {
    return POOL_VERTEX_DEFINITION;
  }

  /** The unskinned XMVector3TransformCoordStream (cpp:184-191 / cpp:101-107). */
  #TransformPositions(transform)
  {
    const position = EveSpriteSet.#positionScratch;
    for (let i = 0; i < this.#spriteData.length; i++)
    {
      vec3.transformMat4(position, this.#spriteData[i].position, transform);
      this.#WritePosition(i, position);
    }
  }

  /** Writes one sprite position as three little-endian floats in the vertex pool. */
  #WritePosition(index, position)
  {
    const base = index * POOL_VERTEX_SIZE;
    this.#poolView.setFloat32(base, position[0], true);
    this.#poolView.setFloat32(base + 4, position[1], true);
    this.#poolView.setFloat32(base + 8, position[2], true);
  }

  /** Carbon EveSpriteSet::GetAabb (cpp:163-166): the item-set bounds, with the
   * bone list forwarded only when the set is skinned. */
  @carbon.method
  @impl.implemented
  GetAabb(out, bones = null, boneCount = 0)
  {
    return GetItemSetAabb(
      out,
      this.#staticBounds,
      this.#boneBounds,
      bones,
      this.skinned ? boneCount : 0
    );
  }

  /** Carbon EveSpriteSet::UpdateVisibility (cpp:130-140): an uninitialized set
   * is NOT visible; otherwise its bounds move into world space and take the
   * frustum box test. No LOD and no display gate - Carbon tests display at draw
   * time, not here. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpriteSet.#aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum?.()?.IsBoxVisible(aabb);
  }

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

  /** Carbon EveSpriteSet::RegisterComponents (cpp:445-452): LightOwner when
   * lights are authored. */
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

  /** Carbon EveSpriteSet::GetLights (cpp:454-469): parentBrightness =
   * activationStrength once before the loop; per light the point conversion
   * on the bone matrix, then Blink scales BOTH radius and innerRadius AFTER
   * conversion (cpp:464-466). No gates - registration covers presence. The
   * profile rides the record by reference (Carbon: GetTextureIndex() with NO
   * +1, unlike Tr2Light::AddLight - the asymmetry is moot by-reference but
   * recorded). */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); profile-index packing is by-reference per lightConversion.js.")
  GetLights(lightManager)
  {
    const features = EveSpriteSet.#features;
    features.parentBrightness = this.#activationStrength;
    features.parentScale = 1;
    const time = lightManager?.GetAnimationTime() ?? 0;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EveSpriteSet.#lightRecord;

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
  static #aabbScratch = box3.create();

  static #features = { parentBrightness: 0, parentScale: 1 };

  static #lightRecord = CreateLightRecord();
}
