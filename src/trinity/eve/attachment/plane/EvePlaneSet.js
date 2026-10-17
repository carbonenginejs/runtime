import { ITr2LightOwner } from "../../lights/ITr2LightOwner.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSet.cpp
import { IsMatch } from "#blue";
import { EveEntity } from "../../EveEntity.js";
import { INotify } from "../../../../global/blue/INotify.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { box3 } from "#math/box3";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { mat3 } from "#math/mat3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta, type, blue } from "#schema";
import { TriTextureRes } from "#resource";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EvePlaneLight } from "./EvePlaneLight.js";
import { EveComponentType } from "../../EntityComponents.js";
import { EveSpaceObjectAttachmentUtils } from "../EveSpaceObjectAttachmentUtils.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { num } from "#math/num";
import { TriBatchType } from "#consts/graphics";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import {
  AsPerPointLightData,
  CopyLightData,
  CreateLightDataScratch,
  CreateLightRecord,
  MatrixCopyFrom3x4
} from "../../lights/lightConversion.js";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

const WHITE = new Float32Array([1, 1, 1, 1]);

// Carbon's function-local s_spriteVertexDecl (EvePlaneSet.cpp:154-168), all
// stream 1: it lands on EvePlaneSet::PlaneVertex (EvePlaneSet.h:124-138) -
// transform1..3 and color as float4 at 0..63, the four layer vectors and
// blinkData as half4 at 64..103, then index, boneIndex, maskMapAtlasIndex and
// pickBufferID as bytes at 104..107.
const PLANE_VERTEX_DEFINITION = new Tr2VertexDefinition();
PLANE_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 0, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 1, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", 2, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT32_4", "COLOR", 0, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT16_4", "TEXCOORD", 3, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT16_4", "TEXCOORD", 4, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT16_4", "TEXCOORD", 5, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT16_4", "TEXCOORD", 6, 1, 1);
PLANE_VERTEX_DEFINITION.Add("FLOAT16_4", "TEXCOORD", 8, 1, 1);
PLANE_VERTEX_DEFINITION.Add("UBYTE_4", "TEXCOORD", 7, 1, 1);

/** sizeof( EvePlaneSet::PlaneVertex ). */
const PLANE_VERTEX_SIZE = 108;

/**
 * Carbon's XMQuaternionRotationMatrix: the rotation of the upper 3x3, read as
 * it stands (no scale is divided out, unlike mat4.getRotation). The byte
 * layouts agree, so gl-matrix's fromMat3 yields the same quaternion.
 * @param {quat} out
 * @param {mat4} m
 * @returns {quat} out
 */
function QuaternionRotationMatrix(out, m)
{
  return quat.fromMat3(out, mat3.fromMat4(DEBUG_BASIS, m));
}

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_BASIS = mat3.create();
const DEBUG_BONE = mat4.create();
const DEBUG_TRANSFORM = mat4.create();
const DEBUG_WORLD = mat4.create();
const DEBUG_ROTATION = quat.create();
const DEBUG_BONE_ROTATION = quat.create();
const DEBUG_POSITION = vec3.create();
const DEBUG_BOUNDS = box3.create();
const DEBUG_AVERAGE_COLOR = vec4.create();
const DEBUG_LIGHT_COLOR = vec4.create();

/** The near-flat box Carbon draws for each plane (cpp:402-403). */
const DEBUG_BOX_MIN = vec3.fromValues(-0.5, -0.5, -0.005);
const DEBUG_BOX_MAX = vec3.fromValues(0.5, 0.5, 0.005);

/** Carbon's plane debug colours (cpp:405). */
const DEBUG_PLANE_COLOR = vec4.fromValues(0.0, 0.7, 0.9, 0.5);
const DEBUG_PLANE_ZFAIL_COLOR = vec4.fromValues(0.0, 0.7, 0.9, 0.1);


/**
 * A hull's authored textured planes, owning their static and per-bone bounds,
 * the four shared texture parameters and the plane lights.
 */
@blue.define("EvePlaneSet")
@blue.inherit(IInitialize, INotify, ITr2LightOwner, EveEntity)
@blue.interface(IInitialize, INotify, IEveSpaceObjectAttachment, EveEntity, ITr2LightOwner)
export class EvePlaneSet extends IEveSpaceObjectAttachment
{
  /**
   * Carbon EvePlaneSet.cpp:116: only the pick buffer change rebuilds.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "pickBufferID")) this.Rebuild();
    return true;
  }

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.uint8
  pickBufferID = 0;

  @blue.readwrite
  @blue.persist
  @type.boolean
  hideOnLowQuality = false;

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
  @type.boolean
  display = true;

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.read
  @blue.persist
  @type.list("EvePlaneSetItem")
  planes = [];

  @meta.persist
  @type.list("EvePlaneLight")
  lights = [];

  // SOF-authored shared texture parameters; persisted so the values
  // interchange reproduces Carbon's hidden plane-set bindings.
  @meta.persist
  @type.rootRef("TriTextureParameter")
  imageMapParameter = null;

  @meta.persist
  @type.rootRef("TriTextureParameter")
  layerMap1Parameter = null;

  @meta.persist
  @type.rootRef("TriTextureParameter")
  layerMap2Parameter = null;

  @meta.persist
  @type.rootRef("TriTextureParameter")
  maskMapParameter = null;
  _rebuildRevision = 0;

  /** m_effectHash: the quad renderer's key. */
  _effectHash = 0;

  /** m_items: one PlaneVertex per visible plane, packed bytes. */
  _items = new Uint8Array(0);

  /** m_volatileData: { transform, color } per packed plane. */
  _volatileData = [];

  /** m_aabb - the union of every unskinned, non-transparent plane (cpp:323-355). */
  _staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  _boneBounds = [];

  /** Carbon m_activationStrength (ctor 0, EvePlaneSet.cpp:76). Lights are
   * BLACK until UpdateLights runs. */
  _activationStrength = 0;

  /**
   * Recomputes the static and per-bone bounds from the authored planes -
   * skipping any plane whose colour is fully zero, which contributes nothing -
   * and marks the packed geometry stale.
   */
  @blue.method
  @meta.adapted
  Rebuild()
  {
    this._rebuildRevision++;

    // Carbon Rebuild (cpp:292-318): each plane that is not fully transparent
    // keeps its local transform and colour for the frame, and packs its layer
    // vectors and blink data as halves with its bone and mask-atlas bytes. The
    // pick buffer id and index stay zero, as Carbon leaves them.
    const packed = this.planes.filter(item => !EvePlaneSet._IsFullyTransparent(item));
    this._items = new Uint8Array(packed.length * PLANE_VERTEX_SIZE);
    const view = new DataView(this._items.buffer);
    this._volatileData = packed.map((plane, i) =>
    {
      const base = i * PLANE_VERTEX_SIZE;
      [ plane.layer1Transform, plane.layer2Transform, plane.layer1Scroll, plane.layer2Scroll, plane.blinkData ].forEach((vector, slot) =>
      {
        for (let c = 0; c < 4; c++) view.setUint16(base + 64 + slot * 8 + c * 2, num.toHalfFloat(vector[c]), true);
      });
      this._items[base + 105] = plane.boneIndex & 0xff;
      this._items[base + 106] = plane.maskAtlasID & 0xff;

      // Carbon TransformationMatrix( scaling, rotation, position ).
      const transform = mat4.fromRotationTranslationScale(mat4.create(), plane.rotation, plane.position, plane.scaling);
      return { transform, color: [ plane.color[0], plane.color[1], plane.color[2], plane.color[3] ] };
    });

    // Carbon CreateBoundingBoxes (cpp:323-355) is the shared builder plus one
    // filter: a fully transparent plane contributes NO bounds at all.
    CreateItemSetBoundingBoxes(
      this._staticBounds,
      this._boneBounds,
      this.skinned,
      this.planes.filter(item => !EvePlaneSet._IsFullyTransparent(item))
    );
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
    if (this.effect) this._effectHash = Number(this.effect.GetHashValue()) >>> 0;
    return true;
  }

  /**
   * Carbon RegisterWithQuadRenderer (cpp:147-171): the key from the effect's
   * current hash, one quad per plane, additive.
   */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.effect) this._effectHash = Number(this.effect.GetHashValue()) >>> 0;
    quadRenderer.RegisterEffect(this._effectHash, TriBatchType.TRIBATCHTYPE_ADDITIVE, PLANE_VERTEX_SIZE, 1, PLANE_VERTEX_DEFINITION, this.effect);
  }

  /**
   * Carbon AddToQuadRenderer (cpp:173-234): each plane's world matrix (through
   * its bone when skinned and the bone exists) as its three columns, and its
   * colour times activation.
   */
  @blue.method
  @meta.implemented
  AddToQuadRenderer(quadRenderer, parentTransform, activation, _boosterGain, bones, boneCount)
  {
    if (!this.display) return;
    if (this.hideOnLowQuality && Tr2Renderer.IsLowQuality()) return;
    if (!this._volatileData.length) return;

    const view = new DataView(this._items.buffer);
    const m = EvePlaneSet._matrixScratch;
    const bone = EvePlaneSet._boneScratch;

    this._volatileData.forEach((data, i) =>
    {
      const base = i * PLANE_VERTEX_SIZE;
      const boneIndex = this._items[base + 105];

      // Carbon's row-vector data.transform * bone * parent.
      if (this.skinned && boneIndex < boneCount)
      {
        MatrixCopyFrom3x4(bone, bones, boneIndex);
        mat4.multiply(m, bone, data.transform);
        mat4.multiply(m, parentTransform, m);
      }
      else
      {
        mat4.multiply(m, parentTransform, data.transform);
      }

      // transformN = (m._1N, m._2N, m._3N, m._4N), column N; Carbon's _rc
      // sits at memory (r - 1) * 4 + (c - 1).
      for (let r = 0; r < 3; r++)
      {
        for (let c = 0; c < 4; c++) view.setFloat32(base + r * 16 + c * 4, m[c * 4 + r], true);
      }
      for (let c = 0; c < 4; c++) view.setFloat32(base + 48 + c * 4, data.color[c] * activation, true);
    });

    quadRenderer.AddQuads(this._effectHash, this._items, this._volatileData.length);
  }

  static _matrixScratch = mat4.create();

  static _boneScratch = mat4.create();

  /** Sets the effect that draws the planes. */
  @blue.method
  @meta.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /**
   * Sets the 8-bit pick buffer id written by the plane geometry, rebuilding
   * immediately when planes are already authored because the id is packed into
   * it.
   */
  @blue.method
  @meta.adapted
  SetPickBufferID(pickBufferID)
  {
    this.pickBufferID = Number(pickBufferID) & 0xff;
    if (this.planes.length) this.Rebuild();
  }

  /** Carbon EvePlaneSet::GetAabb (cpp:273-276): the item-set bounds, with the bone
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

  /** Carbon EvePlaneSet::UpdateVisibility (cpp:236-246): an uninitialized set is
   * NOT visible; otherwise the bounds move into world space and take the
   * frustum box test. No LOD and no display gate. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EvePlaneSet._aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return updateContext.GetFrustum().IsBoxVisible(aabb);
  }

  /**
   * Sets whether the planes ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */
  @blue.method
  @meta.implemented
  SetIsSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  /**
   * Appends an authored plane item; the bounds only pick it up on the next
   * Rebuild.
   */
  @blue.method
  @meta.implemented
  AddPlaneItem(item)
  {
    this.planes.push(item);
  }

  /** The live plane item list, not a copy. */
  @blue.method
  @meta.implemented
  GetPlanes()
  {
    return this.planes;
  }

  /**
   * Carbon EvePlaneSet::GetDebugOptions (cpp:374-379).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Plane Sets");
    options.add("Plane Sets Bounds");
    options.add("Plane Sets Lights");
  }

  /**
   * Carbon EvePlaneSet::RenderDebugInfo (cpp:381-470): three independent
   * options.
   *
   * "Plane Sets" draws every plane twice - wireframe, then solid with a zero
   * colour - as a near-flat box (z +/- 0.005), owned by the plane. A plane
   * with a bone in range has its position moved through the bone and its
   * rotation followed by the bone's rotation; an out-of-range bone is ignored.
   *
   * "Plane Sets Bounds" draws the item-set box in the parent space, and
   * "Plane Sets Lights" draws each light twice, inner then outer radius, in
   * the authored colour times the textures' average colour, saturated, with
   * alpha scaled by the light's fade - the same colour GetLights emits.
   * @param {ITr2DebugRenderer2} renderer
   * @param {mat4} parentTransform
   * @param {Float32Array|null} bones Packed Float4x3 bone matrices.
   * @param {number} boneCount
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, bones, boneCount)
  {
    if (renderer.HasOption(this, "Plane Sets"))
    {
      for (const plane of this.planes)
      {
        const rotation = quat.copy(DEBUG_ROTATION, plane.rotation);
        const position = vec3.copy(DEBUG_POSITION, plane.position);
        const boneIndex = plane.boneIndex;

        // Carbon quirk (cpp:391): `> 0`, not `>= 0`, so a plane on bone 0 is
        // drawn unskinned. Reproduced.
        if (boneIndex > 0 && boneIndex < boneCount)
        {
          const boneTF = mat4.identity(DEBUG_BONE);
          MatrixCopyFrom3x4(boneTF, bones, boneIndex);
          vec3.transformMat4(position, position, boneTF);

          // Carbon: XMQuaternionMultiply( rotation, XMQuaternionRotationMatrix( boneTF ) ) -
          // rotation first, then the bone's, so the Hamilton product is bone * rotation.
          QuaternionRotationMatrix(DEBUG_BONE_ROTATION, boneTF);
          quat.multiply(rotation, DEBUG_BONE_ROTATION, rotation);
        }

        // Carbon (row-vector): XMMatrixTransformation( 0, identity, scaling, 0, rotation, position ) = S * R * T.
        const t = mat4.fromRotationTranslationScale(DEBUG_TRANSFORM, rotation, position, plane.scaling);
        // Carbon (row-vector): t * parentTransform.
        const world = mat4.multiply(DEBUG_WORLD, parentTransform, t);

        renderer.DrawBox__Transform(
          Tr2DebugObjectReference.create__Object(plane),
          world,
          DEBUG_BOX_MIN,
          DEBUG_BOX_MAX,
          ITr2DebugRenderer2.Effect.Wireframe,
          Tr2DebugColor.create__ColorZFail(DEBUG_PLANE_COLOR, DEBUG_PLANE_ZFAIL_COLOR));
        renderer.DrawBox__Transform(
          Tr2DebugObjectReference.create__Object(plane),
          world,
          DEBUG_BOX_MIN,
          DEBUG_BOX_MAX,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Uint32(0));
      }
    }

    if (renderer.HasOption(this, "Plane Sets Bounds"))
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

    if (renderer.HasOption(this, "Plane Sets Lights"))
    {
      const averageColor = vec4.set(DEBUG_AVERAGE_COLOR, 0, 0, 0, 0);
      if (this.lights.length > 0)
      {
        this.GetAverageColor(averageColor);
      }

      for (const l of this.lights)
      {
        const t = mat4.fromTranslation(DEBUG_TRANSFORM, l.lightData.position);
        // Carbon (row-vector): TranslationMatrix( l.lightData.position ) * l.boneMatrix.
        mat4.multiply(t, l.boneMatrix, t);

        const c = vec4.copy(DEBUG_LIGHT_COLOR, l.lightData.color);
        const fade = EveSpaceObjectAttachmentUtils.fade(Tr2Renderer.GetAnimationTime(), l.fadeType, l.blinkRate, l.blinkPhase);

        vec4.multiply(c, c, averageColor);
        EveSpaceObjectAttachmentUtils.saturate(c, c, l.saturation);

        c[3] = 0.5 * fade;

        // Carbon quirk (cpp:449): `>` not `>=`, so an index equal to the plane
        // count reads one past the end; reproduced as an undefined read.
        const planeItem = l.index > this.planes.length ? null : this.planes[l.index];

        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(planeItem),
          t,
          l.lightData.innerRadius,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));

        c[3] = 0.3 * fade;
        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(planeItem),
          t,
          l.lightData.radius,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));
      }
    }
  }

  /**
   * Sets a shader option on the plane effect, doing nothing when no effect is attached.
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
   * Sets the shared image map texture parameter; its average colour is one of
   * the four factors tinting the plane lights.
   */
  @blue.method
  @meta.adapted
  SetImageMapParameter(parameter)
  {
    this.imageMapParameter = parameter ?? null;
  }

  /**
   * Sets the shared first layer map texture parameter; its average colour is one
   * of the four factors tinting the plane lights.
   */
  @blue.method
  @meta.adapted
  SetLayerMap1Parameter(parameter)
  {
    this.layerMap1Parameter = parameter ?? null;
  }

  /**
   * Sets the shared second layer map texture parameter; its average colour is
   * one of the four factors tinting the plane lights.
   */
  @blue.method
  @meta.adapted
  SetLayerMap2Parameter(parameter)
  {
    this.layerMap2Parameter = parameter ?? null;
  }

  /**
   * Sets the shared mask map texture parameter; its average colour is one of the
   * four factors tinting the plane lights.
   */
  @blue.method
  @meta.adapted
  SetMaskMapParameter(parameter)
  {
    this.maskMapParameter = parameter ?? null;
  }

  /**
   * Converts a SOF-authored light description into an EvePlaneLight and appends
   * it to the set.
   */
  @blue.method
  @meta.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EvePlaneLight.FromSOF(light));
  }

  /** Carbon EvePlaneSet::RegisterComponents (cpp:535-542): LightOwner when
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

  /** Carbon EvePlaneSet::UpdateLights (cpp:248-267): the shared packed-set
   * bone pattern (boneIndex >= 0; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * the activation strength (boosterGain unused by planes).
   *
   * Adapted: Carbon skips bone 0 here (EvePlaneSet.cpp:252; CE-27), so a light on binding 0
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
   * Carbon's GetAverageColor( const TriTextureParameterPtr& map )
   * (EvePlaneSet.h:122, cpp:514-528): the average colour of a texture
   * parameter's resource, white when the parameter or its resource is missing,
   * so an absent map is a no-op in the four-way product.
   * @param {TriTextureParameter|null} map
   * @returns {ArrayLike<number>}
   */
  @meta.implemented
  GetAverageColor__Map(map)
  {
    if (!map || !map.GetResource()) return WHITE;
    const resource = CjsSchema.cast(map.GetResource(), TriTextureRes);
    if (!resource) return WHITE;
    return resource.GetAverageColor();
  }

  /**
   * Multiplies the two layer, image and mask textures' average colours componentwise.
   * Each missing texture contributes white through GetAverageColor__Map.
   * Carbon GetAverageColor (EvePlaneSet.cpp:499-528).
   *
   * Adapted: Writes and returns the caller's colour vector instead of a Color value.
   *
   * @param {vec4} [out] Destination colour.
   * @returns {vec4} The destination colour.
   */
  @blue.method
  @meta.adapted
  GetAverageColor(out = new Float32Array(4))
  {
    const layer1 = this.GetAverageColor__Map(this.layerMap1Parameter);
    const layer2 = this.GetAverageColor__Map(this.layerMap2Parameter);
    const image = this.GetAverageColor__Map(this.imageMapParameter);
    const mask = this.GetAverageColor__Map(this.maskMapParameter);
    for (let channel = 0; channel < 4; channel++)
    {
      out[channel] = layer1[channel] * layer2[channel] * image[channel] * mask[channel];
    }
    return out;
  }

  /** Carbon EvePlaneSet::GetLights (cpp:544-568): parentBrightness set once;
   * average color computed only when lights exist (cpp:550-553; zero
   * otherwise - moot, the loop is empty); the loop iterates BY VALUE
   * (cpp:555-557 `auto light` + lightDataCopy) so the stored items are never
   * mutated - a scratch copy carries: color = authored * averageColor
   * componentwise, then Saturate (extrapolating above 1), then brightness *=
   * Fade(fadeType, ...) (cpp:558-564); point conversion on the bone matrix.
   *
   * Adapted: Light-profile packing follows the adapted light-manager surface.
   */
  @blue.method
  @meta.adapted
  GetLights(lightManager)
  {
    const features = EvePlaneSet._features;
    features.parentBrightness = this._activationStrength;
    features.parentScale = 1;
    const averageColor = EvePlaneSet._averageColorScratch;
    if (this.lights.length > 0)
    {
      this.GetAverageColor(averageColor);
    }
    const time = Tr2Renderer.GetAnimationTime();
    const quality = lightManager.GetCurrentSpaceSceneShadowQuality();
    const record = EvePlaneSet._lightRecord;
    const dataCopy = EvePlaneSet._lightDataScratch;

    for (const light of this.lights)
    {
      CopyLightData(dataCopy, light.lightData);
      dataCopy.color[0] *= averageColor[0];
      dataCopy.color[1] *= averageColor[1];
      dataCopy.color[2] *= averageColor[2];
      dataCopy.color[3] *= averageColor[3];
      EveSpaceObjectAttachmentUtils.saturate(dataCopy.color, dataCopy.color, light.saturation);
      dataCopy.brightness *= EveSpaceObjectAttachmentUtils.fade(time, light.fadeType, light.blinkRate, light.blinkPhase);
      AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager.AddLight(record);
    }
  }

  static _features = { parentBrightness: 0, parentScale: 1 };

  /** Carbon CreateBoundingBoxes skips an item whose color is exactly
   * Color(0, 0, 0, 0) (cpp:332-335) - an authored "off" plane contributes no
   * bounds. Any non-zero channel, alpha included, counts. */
  static _IsFullyTransparent(item)
  {
    const color = item?.color;
    return !!color && !color[0] && !color[1] && !color[2] && !color[3];
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static _aabbScratch = box3.create();

  static _lightRecord = CreateLightRecord();

  static _lightDataScratch = CreateLightDataScratch();

  static _averageColorScratch = new Float32Array(4);
}

// EvePlaneSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
