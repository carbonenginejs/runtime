import { EveEntity } from "../../EveEntity.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { meta } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpotlightLight } from "./EveSpotlightLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { AsPerSpotLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { TriBatchType } from "#consts/graphics";
import { num } from "#math/num";
import { Tr2QuadRenderer } from "../../../core/Tr2QuadRenderer/index.js";


// Carbon's two nested pool-vertex layouts, BUILT as Carbon builds them
// (GlowPoolVertex::GetDefinition, EveSpotlightSet.cpp:16-32;
// ConePoolVertex::GetDefinition, cpp:34-49). Stream 0 is the per-corner
// TEXCOORD4 float; stream 1 is the instance data. The ledger lands exactly on
// each struct's size: glow 3xVector4 + 12 halves = 72, cone 3xVector4 +
// 6 halves = 60 (EveSpotlightSet.h:110-137).
const GLOW_POOL_VERTEX_DEFINITION = new Tr2VertexDefinition();
GLOW_POOL_VERTEX_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 4);
GLOW_POOL_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 0, 1, 1);
GLOW_POOL_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 1, 1, 1);
GLOW_POOL_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 2, 1, 1);
GLOW_POOL_VERTEX_DEFINITION.Add("FLOAT16_4", "COLOR", 0, 1, 1);
GLOW_POOL_VERTEX_DEFINITION.Add("FLOAT16_4", "COLOR", 1, 1, 1);
GLOW_POOL_VERTEX_DEFINITION.Add("FLOAT16_4", "TEXCOORD", 3, 1, 1);

const CONE_POOL_VERTEX_DEFINITION = new Tr2VertexDefinition();
CONE_POOL_VERTEX_DEFINITION.Add("FLOAT32_1", "TEXCOORD", 4);
CONE_POOL_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 0, 1, 1);
CONE_POOL_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 1, 1, 1);
CONE_POOL_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 2, 1, 1);
CONE_POOL_VERTEX_DEFINITION.Add("FLOAT16_4", "COLOR", 0, 1, 1);
CONE_POOL_VERTEX_DEFINITION.Add("FLOAT16_2", "TEXCOORD", 3, 1, 1);

/** sizeof(GlowPoolVertex) / sizeof(ConePoolVertex): the stream-1 ledger. */
const GLOW_POOL_VERTEX_SIZE = GLOW_POOL_VERTEX_DEFINITION.nextOffset[1];
const CONE_POOL_VERTEX_SIZE = CONE_POOL_VERTEX_DEFINITION.nextOffset[1];

// Carbon's anonymous-namespace quad counts (EveSpotlightSet.cpp:53-54).
const CONE_QUAD_COUNT = 4;
const SPRITE_QUAD_COUNT = 2;


/**
 * A hull's authored spotlights, owning their static and per-bone bounds, the
 * cone and glow effects that draw them, and the spot lights they emit.
 */
@meta.define({ className: "EveSpotlightSet", family: "eve/attachment/spotlights" })
@meta.blue.inherit(IInitialize)
export class EveSpotlightSet extends IEveSpaceObjectAttachment
{

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSpotlightSetItem")
  spotlightItems = [];

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  coneEffect = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  glowEffect = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  skinned = false;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  intensity = 1;

  @meta.blue.persist
  @meta.type.list("EveSpotlightLight")
  lights = [];

  _rebuildRevision = 0;

  /** m_aabb - the union of every unskinned spotlight (cpp:311). */
  _staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  _boneBounds = [];

  /** Carbon m_activationStrength / m_boosterGain (ctor 0 / 0,
   * EveSpotlightSet.cpp:90-91). Lights are BLACK until UpdateLights runs. */
  _activationStrength = 0;

  _boosterGain = 0;

  /** m_coneEffectHash / m_glowEffectHash: the quad renderer's keys. */
  _coneEffectHash = 0;

  _glowEffectHash = 0;

  /** m_coneBuffer: one ConePoolVertex per spotlight, packed bytes. */
  _coneBuffer = new Uint8Array(0);

  /** m_glowBuffer: one GlowPoolVertex per spotlight, packed bytes. */
  _glowBuffer = new Uint8Array(0);

  /** m_spotlightData: { transform, boneIndex, boosterGainInfluence } per spotlight. */
  _spotlightData = [];

  /**
   * Carbon Rebuild (cpp:274-311): mirrors each item's transform, bone and
   * booster influence, packs the cone colour and the glow's sprite colour,
   * flare colour and scale as halves, then the bounds. The transforms and
   * activation are written per frame by AddToQuadRenderer.
   */
  @meta.blue.method
  @meta.implemented
  Rebuild()
  {
    this._rebuildRevision++;

    const n = this.spotlightItems.length;
    this._coneBuffer = new Uint8Array(n * CONE_POOL_VERTEX_SIZE);
    this._glowBuffer = new Uint8Array(n * GLOW_POOL_VERTEX_SIZE);
    const cone = new DataView(this._coneBuffer.buffer);
    const glow = new DataView(this._glowBuffer.buffer);
    const half = (view, at, value) => view.setUint16(at, num.toHalfFloat(value), true);

    this._spotlightData = this.spotlightItems.map((item, i) =>
    {
      // ConePoolVertex (h:126-137): 3 x Vector4, then m_color[3] at 48.
      for (let c = 0; c < 3; c++) half(cone, i * CONE_POOL_VERTEX_SIZE + 48 + c * 2, item.coneColor[c]);

      // GlowPoolVertex (h:111-124): 3 x Vector4, m_spriteColor[3] at 48,
      // m_flareColor[3] at 56, m_scale[3] at 64.
      const base = i * GLOW_POOL_VERTEX_SIZE;
      for (let c = 0; c < 3; c++)
      {
        half(glow, base + 48 + c * 2, item.spriteColor[c]);
        half(glow, base + 56 + c * 2, item.flareColor[c]);
        half(glow, base + 64 + c * 2, item.spriteScale[c]);
      }

      return { transform: item.transform, boneIndex: item.boneIndex >>> 0, boosterGainInfluence: item.boosterGainInfluence ? 1 : 0 };
    });

    CreateItemSetBoundingBoxes(this._staticBounds, this._boneBounds, this.skinned, this.spotlightItems);
  }

  /** Carbon Initialize (cpp:106-122): the effect keys, then the first Rebuild. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    if (this.coneEffect) this._coneEffectHash = Number(this.coneEffect.GetHashValue()) >>> 0;
    if (this.glowEffect) this._glowEffectHash = Number(this.glowEffect.GetHashValue()) >>> 0;
    this.Rebuild();
    return true;
  }

  /** Carbon RegisterWithQuadRenderer (cpp:194-198): the cone, then the glow. */
  @meta.blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    this.RegisterQuadRendererCone(quadRenderer);
    this.RegisterQuadRendererGlow(quadRenderer);
  }

  /**
   * Carbon AddToQuadRenderer (cpp:212-272): each spotlight's world matrix
   * (through its bone when skinned and the bone exists) is written into both
   * vertices as its three columns, with activation * intensity and the booster
   * gain influence as halves; the glows, then the cones, go to the renderer.
   */
  @meta.blue.method
  @meta.implemented
  AddToQuadRenderer(quadRenderer, world, activation, boosterGain, bones, boneCount)
  {
    if (!this.display || !this._glowBuffer.length) return;

    const cone = new DataView(this._coneBuffer.buffer);
    const glow = new DataView(this._glowBuffer.buffer);
    const m = EveSpotlightSet._matrixScratch;
    const bone = EveSpotlightSet._boneScratch;
    const activation16 = num.toHalfFloat(activation * this.intensity);

    this._spotlightData.forEach((data, i) =>
    {
      // Carbon's row-vector transform * world (and transform * bone * world).
      if (this.skinned && data.boneIndex < boneCount)
      {
        MatrixCopyFrom3x4(bone, bones, data.boneIndex);
        mat4.multiply(m, bone, data.transform);
        mat4.multiply(m, world, m);
      }
      else
      {
        mat4.multiply(m, world, data.transform);
      }

      const influence = num.toHalfFloat(1 + (boosterGain - 1) * data.boosterGainInfluence);
      const coneBase = i * CONE_POOL_VERTEX_SIZE;
      const glowBase = i * GLOW_POOL_VERTEX_SIZE;

      // m_transformR = (m._1R, m._2R, m._3R, m._4R). The byte layouts agree,
      // so Carbon's _cR is memory index (c - 1) * 4 + (R - 1).
      for (let r = 0; r < 3; r++)
      {
        for (let c = 0; c < 4; c++)
        {
          const value = m[c * 4 + r];
          cone.setFloat32(coneBase + r * 16 + c * 4, value, true);
          glow.setFloat32(glowBase + r * 16 + c * 4, value, true);
        }
      }

      glow.setUint16(glowBase + 54, activation16, true);
      glow.setUint16(glowBase + 70, influence, true);
      cone.setUint16(coneBase + 54, activation16, true);
      cone.setUint16(coneBase + 56, influence, true);
    });

    quadRenderer.AddQuads(this._glowEffectHash, this._glowBuffer, this._spotlightData.length);
    quadRenderer.AddQuads(this._coneEffectHash, this._coneBuffer, this._spotlightData.length);
  }

  static _matrixScratch = mat4.create();

  static _boneScratch = mat4.create();

  /** The effect that draws the light cones. */
  @meta.blue.method
  @meta.implemented
  GetConeEffect()
  {
    return this.coneEffect;
  }

  /** Sets the effect that draws the light cones. */
  @meta.blue.method
  @meta.implemented
  SetConeEffect(effect)
  {
    this.coneEffect = effect ?? null;
    this._coneEffectHash = this.coneEffect ? Number(this.coneEffect.GetHashValue()) >>> 0 : 0;
  }

  /** The effect that draws the glow sprite at each cone's source. */
  @meta.blue.method
  @meta.implemented
  GetGlowEffect()
  {
    return this.glowEffect;
  }

  /** Sets the effect that draws the glow sprite at each cone's source. */
  @meta.blue.method
  @meta.implemented
  SetGlowEffect(effect)
  {
    this.glowEffect = effect ?? null;
    this._glowEffectHash = this.glowEffect ? Number(this.glowEffect.GetHashValue()) >>> 0 : 0;
  }

  /**
   * Carbon RegisterQuadRendererCone (EveSpotlightSet.cpp:124-127): one
   * additive-batch registration keyed by the cone effect's hash. Carbon
   * registers through its cached m_coneEffectHash; the key is read from the
   * effect here, exactly as EveSpriteSet's registration seam does.
   */
  @meta.blue.method
  @meta.implemented
  RegisterQuadRendererCone(quadRenderer)
  {
    quadRenderer.RegisterEffect(
      this._coneEffectHash,
      TriBatchType.TRIBATCHTYPE_ADDITIVE,
      CONE_POOL_VERTEX_SIZE,
      CONE_QUAD_COUNT,
      CONE_POOL_VERTEX_DEFINITION,
      this.coneEffect
    );
  }

  /**
   * Carbon RegisterQuadRendererGlow (cpp:129-132): the glow twin, two quads
   * per sprite.
   */
  @meta.blue.method
  @meta.implemented
  RegisterQuadRendererGlow(quadRenderer)
  {
    quadRenderer.RegisterEffect(
      this._glowEffectHash,
      TriBatchType.TRIBATCHTYPE_ADDITIVE,
      GLOW_POOL_VERTEX_SIZE,
      SPRITE_QUAD_COUNT,
      GLOW_POOL_VERTEX_DEFINITION,
      this.glowEffect
    );
  }

  /** The built ConePoolVertex declaration (nested-struct static in Carbon). */
  static getConeDefinition()
  {
    return CONE_POOL_VERTEX_DEFINITION;
  }

  /** The built GlowPoolVertex declaration (nested-struct static in Carbon). */
  static getGlowDefinition()
  {
    return GLOW_POOL_VERTEX_DEFINITION;
  }

  /** Carbon EveSpotlightSet::GetAabb (cpp:176-179): the item-set bounds, with the bone
   * list forwarded only when the set is skinned. */
  @meta.blue.method
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

  /** Carbon EveSpotlightSet::UpdateVisibility (cpp:138-148): an uninitialized set is
   * NOT visible; otherwise the bounds move into world space and take the
   * frustum box test. No LOD and no display gate. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpotlightSet._aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum()?.IsBoxVisible(aabb);
  }

  /**
   * Sets whether the spotlights ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */
  @meta.blue.method
  @meta.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  /** The authored set name, which SOF uses to match this set to its DNA entry. */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored set name, coercing null or undefined to an empty string. */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** The live spotlight item list, not a copy. */
  @meta.blue.method
  @meta.implemented
  GetSpotlightItems()
  {
    return this.spotlightItems;
  }

  /**
   * Appends an authored spotlight item; the bounds only pick it up on the next
   * Rebuild.
   */
  @meta.blue.method
  @meta.implemented
  AddSpotlightItem(item)
  {
    this.spotlightItems.push(item);
  }

  /**
   * Carbon SetShaderOption (cpp:405-420): the option changes the effect's
   * permutation and so its hash, and the set registers again under it.
   */
  @meta.blue.method
  @meta.implemented
  SetShaderOption(name, value)
  {
    if (this.coneEffect)
    {
      this.coneEffect.SetOption(name, value);
      this._coneEffectHash = Number(this.coneEffect.GetHashValue()) >>> 0;
      this.RegisterQuadRendererCone(Tr2QuadRenderer.Instance());
    }
    if (this.glowEffect)
    {
      this.glowEffect.SetOption(name, value);
      this._glowEffectHash = Number(this.glowEffect.GetHashValue()) >>> 0;
      this.RegisterQuadRendererGlow(Tr2QuadRenderer.Instance());
    }
  }

  /**
   * Converts a SOF-authored light description into an EveSpotlightLight and
   * appends it to the set.
   */
  @meta.blue.method
  @meta.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveSpotlightLight.FromSOF(light));
  }

  /** Carbon EveSpotlightSet::RegisterComponents (cpp:527-534): LightOwner
   * when lights are authored. */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.lights.length)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /** Carbon EveSpotlightSet::UpdateLights (cpp:150-170): the shared
   * packed-set bone pattern (boneIndex > 0 only; column-stride Float4x3
   * unpack; 4th column zeroed, [15] = 1; boneMatrix *= parentTransform -
   * Carbon row-vector, bone FIRST: gl operands SWAP; else copy the parent).
   * Stamps BOTH activationStrength and boosterGain (cpp:168-169). */
  @meta.blue.method
  @meta.implemented
  UpdateLights(parentTransform, bones, boneCount, activationStrength, boosterGain = 0)
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
    this._boosterGain = Number(boosterGain) || 0;
  }

  /** Carbon EveSpotlightSet::GetLights (cpp:536-552): the haze pattern
   * (parentBrightness inside the loop, boosterGainInfluence multiply) but
   * with the SPOT conversion (cpp:549) - cos-of-degree angles and the
   * 1/tan(outerAngle) projection-plane distance, Infinity at outerAngle 0
   * exactly as Carbon ships. The spot direction comes from lightData.rotation
   * via the conversion's swapped RotationMatrix * transform composition. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Profile-index packing is by-reference per lightConversion.js conventions.")
  GetLights(lightManager)
  {
    const features = EveSpotlightSet._features;
    features.parentScale = 1;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EveSpotlightSet._lightRecord;

    for (const light of this.lights)
    {
      features.parentBrightness = this._activationStrength;
      if (light.boosterGainInfluence)
      {
        features.parentBrightness *= this._boosterGain;
      }
      AsPerSpotLightData(record, light.lightData, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.SPOT_LIGHT;
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

// EveSpotlightSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
meta.blue.interfaceTable({ interfaces: [EveSpotlightSet, IInitialize, IEveSpaceObjectAttachment, EveEntity], chainTo: null })(EveSpotlightSet, { kind: "class" });
