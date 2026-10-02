import { EveEntity } from "../../EveEntity.js";
import { INotify } from "../../../../global/blue/INotify.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSet.cpp
import { box3 } from "#math/box3";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { mat4 } from "#math/mat4";
import { CjsSchema, meta } from "#schema";
import { TriTextureRes } from "#resource";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EvePlaneLight } from "./EvePlaneLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Fade, Saturate } from "../EveSpaceObjectAttachmentUtils.js";
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
 * A hull's authored textured planes, owning their static and per-bone bounds,
 * the four shared texture parameters and the plane lights.
 */
@meta.define({ className: "EvePlaneSet", family: "eve/attachment/planes" })
@meta.blue.inherit(IInitialize, INotify)
export class EvePlaneSet extends IEveSpaceObjectAttachment
{
  /** Carbon EvePlaneSet.cpp:116: only the pick buffer change rebuilds. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS identifies Carbon's changed member address by its exposed property name.")
  OnModified(propertyName)
  {
    if (propertyName === "pickBufferID") this.Rebuild();
    return true;
  }

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint8
  pickBufferID = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  hideOnLowQuality = false;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  effect = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  skinned = false;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EvePlaneSetItem")
  planes = [];

  @meta.blue.persist
  @meta.type.list("EvePlaneLight")
  lights = [];

  // SOF-authored shared texture parameters; persisted so the values
  // interchange reproduces Carbon's hidden plane-set bindings.
  @meta.blue.persist
  @meta.type.objectRef("TriTextureParameter")
  imageMapParameter = null;

  @meta.blue.persist
  @meta.type.objectRef("TriTextureParameter")
  layerMap1Parameter = null;

  @meta.blue.persist
  @meta.type.objectRef("TriTextureParameter")
  layerMap2Parameter = null;

  @meta.blue.persist
  @meta.type.objectRef("TriTextureParameter")
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  SetPickBufferID(pickBufferID)
  {
    this.pickBufferID = Number(pickBufferID) & 0xff;
    if (this.planes.length) this.Rebuild();
  }

  /** Carbon EvePlaneSet::GetAabb (cpp:273-276): the item-set bounds, with the bone
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

  /** Carbon EvePlaneSet::UpdateVisibility (cpp:236-246): an uninitialized set is
   * NOT visible; otherwise the bounds move into world space and take the
   * frustum box test. No LOD and no display gate. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = this.GetAabb(EvePlaneSet._aabbScratch, bones, boneCount);
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum()?.IsBoxVisible(aabb);
  }

  /**
   * Sets whether the planes ride skeleton bones, which is what decides if
   * GetAabb consults the caller's bone list at all.
   */
  @meta.blue.method
  @meta.implemented
  SetIsSkinned(skinned)
  {
    this.skinned = !!skinned;
  }

  /**
   * Appends an authored plane item; the bounds only pick it up on the next
   * Rebuild.
   */
  @meta.blue.method
  @meta.implemented
  AddPlaneItem(item)
  {
    this.planes.push(item);
  }

  /** The live plane item list, not a copy. */
  @meta.blue.method
  @meta.implemented
  GetPlanes()
  {
    return this.planes;
  }

  /**
   * Sets a shader option on the plane effect, doing nothing when no effect that
   * accepts options is attached.
   */
  @meta.blue.method
  @meta.adapted
  SetShaderOption(name, value)
  {
    if (this.effect && typeof this.effect.SetOption === "function")
    {
      this.effect.SetOption(name, value);
    }
  }

  /**
   * Sets the shared image map texture parameter; its average colour is one of
   * the four factors tinting the plane lights.
   */
  @meta.blue.method
  @meta.adapted
  SetImageMapParameter(parameter)
  {
    this.imageMapParameter = parameter ?? null;
  }

  /**
   * Sets the shared first layer map texture parameter; its average colour is one
   * of the four factors tinting the plane lights.
   */
  @meta.blue.method
  @meta.adapted
  SetLayerMap1Parameter(parameter)
  {
    this.layerMap1Parameter = parameter ?? null;
  }

  /**
   * Sets the shared second layer map texture parameter; its average colour is
   * one of the four factors tinting the plane lights.
   */
  @meta.blue.method
  @meta.adapted
  SetLayerMap2Parameter(parameter)
  {
    this.layerMap2Parameter = parameter ?? null;
  }

  /**
   * Sets the shared mask map texture parameter; its average colour is one of the
   * four factors tinting the plane lights.
   */
  @meta.blue.method
  @meta.adapted
  SetMaskMapParameter(parameter)
  {
    this.maskMapParameter = parameter ?? null;
  }

  /**
   * Converts a SOF-authored light description into an EvePlaneLight and appends
   * it to the set.
   */
  @meta.blue.method
  @meta.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EvePlaneLight.FromSOF(light));
  }

  /** Carbon EvePlaneSet::RegisterComponents (cpp:535-542): LightOwner when
   * lights are authored. */
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

  /** Carbon EvePlaneSet::UpdateLights (cpp:248-267): the shared packed-set
   * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * the activation strength (boosterGain unused by planes). */
  @meta.blue.method
  @meta.implemented
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

  /** Carbon EvePlaneSet::GetAverageColor (cpp:499-528): the componentwise
   * product of the four texture parameters' average colors, each defaulting
   * to white when the map or its resource is missing. */
  @meta.blue.method
  GetAverageColor(out = new Float32Array(4))
  {
    const layer1 = EvePlaneSet._MapAverageColor(this.layerMap1Parameter);
    const layer2 = EvePlaneSet._MapAverageColor(this.layerMap2Parameter);
    const image = EvePlaneSet._MapAverageColor(this.imageMapParameter);
    const mask = EvePlaneSet._MapAverageColor(this.maskMapParameter);
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
   * Fade(fadeType, ...) (cpp:558-564); point conversion on the bone matrix. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Light-profile packing follows the adapted light-manager surface.")
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
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EvePlaneSet._lightRecord;
    const dataCopy = EvePlaneSet._lightDataScratch;

    for (const light of this.lights)
    {
      CopyLightData(dataCopy, light.lightData);
      dataCopy.color[0] *= averageColor[0];
      dataCopy.color[1] *= averageColor[1];
      dataCopy.color[2] *= averageColor[2];
      dataCopy.color[3] *= averageColor[3];
      Saturate(dataCopy.color, dataCopy.color, light.saturation);
      dataCopy.brightness *= Fade(time, light.fadeType, light.blinkRate, light.blinkPhase);
      AsPerPointLightData(record, dataCopy, light.boneMatrix, features, quality);
      record.lightType = Tr2Light.POINT_LIGHT;
      record.lightData = light.lightData;
      record.lightProfile = light.lightProfile;
      record.owner = this;
      lightManager?.AddLight(record);
    }
  }

  /**
   * The average colour of a texture parameter's resource, white when the
   * parameter, its resource or its average colour is missing, so an absent map
   * is a no-op in the four-way product.
   */
  static _MapAverageColor(parameter)
  {
    // Carbon: white when the map or its TriTextureRes is missing (cpp:516-527).
    if (!parameter || !parameter.GetResource()) return WHITE;
    const resource = CjsSchema.cast(parameter.GetResource(), TriTextureRes);
    if (!resource) return WHITE;
    return resource.GetAverageColor();
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
meta.blue.interfaceTable({ interfaces: [EvePlaneSet, IInitialize, INotify, IEveSpaceObjectAttachment, EveEntity], chainTo: null })(EvePlaneSet, { kind: "class" });
