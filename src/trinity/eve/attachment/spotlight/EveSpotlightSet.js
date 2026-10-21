import { exposure as be } from "#be";
import { ITr2LightOwner } from "../../lights/ITr2LightOwner.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.cpp
import { EveEntity } from "../../EveEntity.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveSpotlightLight } from "./EveSpotlightLight.js";
import { EveSpotlightSetSpotlightData } from "./EveSpotlightSetSpotlightData.js";
import { EveComponentType } from "../../EntityComponents.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { LightFeatures } from "../../lights/LightFeatures.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { TriBatchType } from "#consts/graphics";
import { num } from "#math/num";
import { Tr2QuadRenderer } from "../../../core/Tr2QuadRenderer/index.js";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";


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

/** Carbon's TRI_2PI (TriMath.h:245), the float literal 6.283185307f. */
const TRI_2PI = Math.fround(6.283185307);

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_ROTATION_X = mat4.create();
const DEBUG_TRANSLATION = mat4.create();
const DEBUG_OFFSET = mat4.create();
const DEBUG_WORLD = mat4.create();
const DEBUG_BOUNDS = box3.create();
const DEBUG_LIGHT_COLOR = vec4.create();

/** XMMatrixTranslation( 0, 0, 0.5f ) in the cone offset (cpp:451). */
const DEBUG_CONE_OFFSET = vec3.fromValues(0, 0, 0.5);


/**
 * A hull's authored spotlights, owning their static and per-bone bounds, the
 * cone and glow effects that draw them, and the spot lights they emit.
 */
@be.define("EveSpotlightSet")
@blue.inherit(IInitialize, ITr2LightOwner, EveEntity)
@be.mapInterface(IInitialize)
@be.mapInterface(IEveSpaceObjectAttachment)
@be.mapInterface(EveEntity)
@be.mapInterface(ITr2LightOwner)
export class EveSpotlightSet extends IEveSpaceObjectAttachment
{

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSpotlightSetItem")
  spotlightItems = [];

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  display = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2Effect")
  coneEffect = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("Tr2Effect")
  glowEffect = null;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  skinned = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  intensity = 1;

  @meta.attribute(meta.PERSIST)
  @type.list("EveSpotlightLight")
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

  /**
   * m_spotlightData: one SpotlightData per spotlight.
   * @type {Array<EveSpotlightSetSpotlightData>}
   */
  _spotlightData = [];

  /**
   * Carbon Rebuild (cpp:274-311): mirrors each item's transform, bone and
   * booster influence, packs the cone colour and the glow's sprite colour,
   * flare colour and scale as halves, then the bounds. The transforms and
   * activation are written per frame by AddToQuadRenderer.
   */
  @be.mapMethodAndWrap()
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

      // m_spotlightData holds SpotlightData by value (h:143-148): the item's
      // transform is copied, not shared.
      const data = new EveSpotlightSetSpotlightData();
      mat4.copy(data.transform, item.transform);
      data.boneIndex = item.boneIndex >>> 0;
      data.boosterGainInfluence = item.boosterGainInfluence ? 1 : 0;
      return data;
    });

    CreateItemSetBoundingBoxes(this._staticBounds, this._boneBounds, this.skinned, this.spotlightItems);
  }

  /** Carbon Initialize (cpp:106-122): the effect keys, then the first Rebuild. */

  @meta.implemented
  Initialize()
  {
    if (this.coneEffect) this._coneEffectHash = Number(this.coneEffect.GetHashValue()) >>> 0;
    if (this.glowEffect) this._glowEffectHash = Number(this.glowEffect.GetHashValue()) >>> 0;
    this.Rebuild();
    return true;
  }

  /** Carbon RegisterWithQuadRenderer (cpp:194-198): the cone, then the glow. */

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

  @meta.implemented
  GetConeEffect()
  {
    return this.coneEffect;
  }

  /** Sets the effect that draws the light cones. */

  @meta.implemented
  SetConeEffect(effect)
  {
    this.coneEffect = effect ?? null;
    this._coneEffectHash = this.coneEffect ? Number(this.coneEffect.GetHashValue()) >>> 0 : 0;
  }

  /** The effect that draws the glow sprite at each cone's source. */

  @meta.implemented
  GetGlowEffect()
  {
    return this.glowEffect;
  }

  /** Sets the effect that draws the glow sprite at each cone's source. */

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

  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EveSpotlightSet._aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return updateContext.GetFrustum().IsBoxVisible(aabb);
  }

  /**
   * Sets whether the spotlights ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */

  @meta.implemented
  SetSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  /** The authored set name, which SOF uses to match this set to its DNA entry. */

  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored set name, coercing null or undefined to an empty string. */

  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** The live spotlight item list, not a copy. */

  @meta.implemented
  GetSpotlightItems()
  {
    return this.spotlightItems;
  }

  /**
   * Appends an authored spotlight item; the bounds only pick it up on the next
   * Rebuild.
   */

  @meta.implemented
  AddSpotlightItem(item)
  {
    this.spotlightItems.push(item);
  }

  /**
   * Carbon SetShaderOption (cpp:405-420): the option changes the effect's
   * permutation and so its hash, and the set registers again under it.
   */

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
   * Carbon EveSpotlightSet::GetDebugOptions (cpp:440-445).
   * @param {Set<string>} options The caller-owned option set.
   */

  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Spotlight Sets");
    options.add("Spotlight Sets Bounds");
    options.add("Spotlight Sets Lights");
  }

  /**
   * Carbon EveSpotlightSet::RenderDebugInfo (cpp:447-522): three independent
   * options.
   *
   * "Spotlight Sets" draws each spotlight's cone twice - wireframe, then solid
   * with a zero colour - as a unit cone (radius 0.5, height 1) turned from +Y
   * to -Z and pushed 0.5 along Z, under the item's transform and the parent
   * transform, owned by the item. Carbon ignores the item's bone here.
   *
   * "Spotlight Sets Bounds" draws the item-set box in the parent space, and
   * "Spotlight Sets Lights" draws each light's inner and outer cone (height
   * the light radius, angle the authored degrees in radians), owned by the
   * light's item.
   * @param {ITr2DebugRenderer2} renderer
   * @param {mat4} parentTransform
   * @param {Float32Array|null} bones Packed Float4x3 bone matrices.
   * @param {number} boneCount
   */

  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, bones, boneCount)
  {
    if (renderer.HasOption(this, "Spotlight Sets"))
    {
      const rotation = mat4.fromXRotation(DEBUG_ROTATION_X, -Math.PI / 2);
      const translation = mat4.fromTranslation(DEBUG_TRANSLATION, DEBUG_CONE_OFFSET);
      // Carbon (row-vector): RotationX( -XM_PI / 2 ) * Translation( 0, 0, 0.5 ).
      const offset = mat4.multiply(DEBUG_OFFSET, translation, rotation);

      for (const item of this.spotlightItems)
      {
        const transform = item.transform;

        // Carbon (row-vector): offset * transform * parentTransform.
        const world = mat4.multiply(DEBUG_WORLD, transform, offset);
        mat4.multiply(world, parentTransform, world);

        renderer.DrawCone__TransformRadius(
          Tr2DebugObjectReference.create__Object(item),
          world,
          0.5,
          1.0,
          10,
          ITr2DebugRenderer2.Effect.Wireframe,
          Tr2DebugColor.create__Uint32ZFail(0xffaaff00, 0x22aaff00));

        renderer.DrawCone__TransformRadius(
          Tr2DebugObjectReference.create__Object(item),
          world,
          0.5,
          1.0,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Uint32(0));
      }
    }

    if (renderer.HasOption(this, "Spotlight Sets Bounds"))
    {
      const aabb = this.GetAabb(DEBUG_BOUNDS, bones, boneCount);
      renderer.DrawBox__Transform(
        Tr2DebugObjectReference.create__Object(this),
        parentTransform,
        box3.$min(aabb),
        box3.$max(aabb),
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0xff00ff00));
    }

    if (renderer.HasOption(this, "Spotlight Sets Lights"))
    {
      for (const l of this.lights)
      {
        // Carbon (row-vector): RotationMatrix( l.lightData.rotation ) * TranslationMatrix( l.lightData.position ) * l.boneMatrix.
        const t = mat4.fromRotationTranslation(DEBUG_WORLD, l.lightData.rotation, l.lightData.position);
        mat4.multiply(t, l.boneMatrix, t);

        const c = vec4.copy(DEBUG_LIGHT_COLOR, l.lightData.color);

        c[3] = 0.5;

        // Carbon quirk (cpp:496): `>` not `>=`, so an index equal to the item
        // count reads one past the end; reproduced as an undefined read.
        const spotlightItem = l.index > this.spotlightItems.length ? null : this.spotlightItems[l.index];

        renderer.DrawCone__TransformAngle(
          Tr2DebugObjectReference.create__Object(spotlightItem),
          t,
          l.lightData.innerRadius,
          TRI_2PI * l.lightData.innerAngle / 360,
          10,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));

        c[3] = 0.3;
        renderer.DrawCone__TransformAngle(
          Tr2DebugObjectReference.create__Object(spotlightItem),
          t,
          l.lightData.radius,
          TRI_2PI * l.lightData.outerAngle / 360,
          10,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));
      }
    }
  }

  /**
   * Converts a SOF-authored light description into an EveSpotlightLight and
   * appends it to the set.
   */

  @meta.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveSpotlightLight.FromSOF(light));
  }

  /** Carbon EveSpotlightSet::RegisterComponents (cpp:527-534): LightOwner
   * when lights are authored. */

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
   * packed-set bone pattern (boneIndex >= 0; column-stride Float4x3
   * unpack; 4th column zeroed, [15] = 1; boneMatrix *= parentTransform -
   * Carbon row-vector, bone FIRST: gl operands SWAP; else copy the parent).
   * Stamps BOTH activationStrength and boosterGain (cpp:168-169).
   *
   * Adapted: Carbon skips bone 0 here (EveSpotlightSet.cpp:154; CE-27), so a light on binding 0
   * gets only the parent transform. Binding 0 is a mesh bone binding and can
   * be animated - the Bowhead (orecs2_t1) moves its MASTER binding through
   * Normal2Warp - so ours applies bone 0 like any other. */

  @meta.adapted
  UpdateLights(parentTransform, bones, boneCount, activationStrength, boosterGain = 0)
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
    this._boosterGain = Number(boosterGain) || 0;
  }

  /** Carbon EveSpotlightSet::GetLights (cpp:536-552): the haze pattern
   * (parentBrightness inside the loop, boosterGainInfluence multiply) but
   * with the SPOT conversion (cpp:549) - cos-of-degree angles and the
   * 1/tan(outerAngle) projection-plane distance, Infinity at outerAngle 0
   * exactly as Carbon ships. The spot direction comes from lightData.rotation
   * via the conversion's swapped RotationMatrix * transform composition.
   *
   * Adapted: Profile-index packing is by-reference per lightConversion.js conventions.
   */

  @meta.adapted
  GetLights(lightManager)
  {
    const features = EveSpotlightSet._features;
    features.parentScale = 1;
    const quality = lightManager.GetCurrentSpaceSceneShadowQuality();
    const record = EveSpotlightSet._lightRecord;

    for (const light of this.lights)
    {
      features.parentBrightness = this._activationStrength;
      if (light.boosterGainInfluence)
      {
        features.parentBrightness *= this._boosterGain;
      }
      light.lightData.AsPerSpotLightData(light.boneMatrix, features, quality, record);
      record.lightType = Tr2Light.SPOT_LIGHT;
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

  /** Carbon EveSpotlightSet::SpotlightData (private, EveSpotlightSet.h:143-148). */
  static SpotlightData = EveSpotlightSetSpotlightData;
}

// EveSpotlightSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
