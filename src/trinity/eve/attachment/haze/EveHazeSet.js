// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.cpp
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { carbon, edit, impl, type } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveHazeSetLight } from "./EveHazeSetLight.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { AsPerPointLightData, CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { CreateItemSetBoundingBoxes, GetItemSetAabb } from "../itemSetBounds.js";
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderReason } from "../../../generated/trinityCore/enums.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { SharedGeometryBuffer } from "../../../core/mesh/TriGeometryResAllocations.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { TriDevice } from "../../../core/device/TriDevice.js";

// Carbon's function-local s_hazeVertexDecl (EveHazeSet.cpp:131-145), stream 0:
// it lands on HazeVertex (cpp:15-31) - three transform rows, three inverse
// rows, hazeData and colour as float4, then the corner index and bone index
// as bytes with two bytes of padding: 132 bytes.
const HAZE_VERTEX_DEFINITION = new Tr2VertexDefinition();
for (let usageIndex = 0; usageIndex < 7; usageIndex++) HAZE_VERTEX_DEFINITION.Add("FLOAT32_4", "TEXCOORD", usageIndex);
HAZE_VERTEX_DEFINITION.Add("FLOAT32_4", "COLOR", 0);
HAZE_VERTEX_DEFINITION.Add("UBYTE_4", "TEXCOORD", 7);

/** sizeof( HazeVertex ). */
const HAZE_VERTEX_SIZE = 132;

/** Carbon's s_boxInds (cpp:157-164): each box face's four corners. */
const BOX_INDICES = [ [ 0, 1, 2, 3 ], [ 7, 6, 5, 4 ], [ 0, 4, 5, 1 ], [ 3, 2, 6, 7 ], [ 1, 5, 6, 2 ], [ 4, 0, 3, 7 ] ];


/**
 * A hull's authored haze volumes, owning their per-bone bounds and the point
 * lights the haze emits.
 */
@type.define({ className: "EveHazeSet", family: "eve/attachment/haze" })
export class EveHazeSet extends IEveSpaceObjectAttachment
{

  @edit.readwrite
  @edit.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @edit.readwrite
  @edit.persist
  @type.boolean
  display = true;

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.read
  @edit.persist
  @type.list("EveHazeSetItem")
  hazes = [];

  @edit.persist
  @type.list("EveHazeSetLight")
  lights = [];

  _rebuildRevision = 0;

  /** m_aabb - the union of every haze that rides the parent transform. */
  _staticBounds = box3.create();

  /** m_boundingBoxes - [{ boneIndex, bounds }], ascending. */
  _boneBounds = [];

  /** Carbon m_activationStrength (ctor 0, EveHazeSet.cpp:66) and
   * m_boosterGain (ctor `false` = 0.0f, cpp:67 - a float initialized with a
   * bool, verbatim quirk). Lights are BLACK until UpdateLights runs. */
  _activationStrength = 0;

  _boosterGain = 0;

  /** m_vertexDeclHandle */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_vertexCount: 24 per haze, a box of six quads. */
  _vertexCount = 0;

  /** m_vertexBuffer: the shared-buffer allocation, null until prepared. */
  _vertexBuffer = null;

  /** m_cachedTransforms: each haze's local transform. */
  _cachedTransforms = [];

  /**
   * A Tr2DeviceResource: the device prepares it again once resources can be
   * created, so a set initialized before the device exists gets its buffer.
   */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /** Sets the effect that draws the haze volumes. */
  @carbon.method
  @impl.implemented
  Setup(effect)
  {
    this.effect = effect ?? null;
  }

  /** Carbon Initialize (cpp:77-82): the device half, then the bounds. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.PrepareResources();
    this.CreateBoundingBox();
    return true;
  }

  /**
   * Carbon Rebuild (cpp:298-303): release and prepare the device half again,
   * then the bounds.
   */
  @carbon.method
  @impl.implemented
  Rebuild()
  {
    this._rebuildRevision++;
    this.ReleaseResources(0);
    this.PrepareResources();
    this.CreateBoundingBox();
  }

  /**
   * Carbon ReleaseResources (cpp:84-88).
   *
   * Adapted: Tr2SuballocatedBuffer has no Free, so the allocation is dropped
   * rather than returned, as EveBoosterSet2 does.
   */
  @carbon.method
  @impl.adapted
  ReleaseResources(_storage)
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer = null;
  }

  /** Carbon Tr2DeviceResource::PrepareResources: creation only when the device allows it. */
  @carbon.method
  @impl.implemented
  PrepareResources()
  {
    return Tr2Renderer.IsResourceCreationAllowed() ? this.OnPrepareResources() : true;
  }

  /**
   * Carbon OnPrepareResources (cpp:117-203): the declaration, then 24
   * vertices per haze - each box face's four corners carrying the haze's
   * local transform and inverse as rows, its haze data and colour, the corner
   * index and bone index - into the shared buffer, and quad-list indices for
   * all of them.
   */
  @carbon.method
  @impl.implemented
  OnPrepareResources()
  {
    this._cachedTransforms = [];

    if (this._vertexBuffer) return true;
    if (!this.hazes.length) return true;

    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(HAZE_VERTEX_DEFINITION);
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;

    this._vertexCount = 24 * this.hazes.length;
    const bytes = new Uint8Array(this._vertexCount * HAZE_VERTEX_SIZE);
    const view = new DataView(bytes.buffer);
    const inverse = mat4.create();

    this.hazes.forEach((haze, i) =>
    {
      // Carbon TransformationMatrix( scaling, rotation, position ) and Inverse.
      const transform = mat4.fromRotationTranslationScale(mat4.create(), haze.rotation, haze.position, haze.scaling);
      mat4.invert(inverse, transform);

      for (let face = 0; face < 6; face++)
      {
        for (let corner = 0; corner < 4; corner++)
        {
          const base = (i * 24 + face * 4 + corner) * HAZE_VERTEX_SIZE;

          // Row N = (m._1N, m._2N, m._3N, m._4N); Carbon's _rc sits at
          // memory (r - 1) * 4 + (c - 1), which the byte layouts share.
          for (let r = 0; r < 3; r++)
          {
            for (let c = 0; c < 4; c++)
            {
              view.setFloat32(base + r * 16 + c * 4, transform[c * 4 + r], true);
              view.setFloat32(base + 48 + r * 16 + c * 4, inverse[c * 4 + r], true);
            }
          }
          for (let c = 0; c < 4; c++)
          {
            view.setFloat32(base + 96 + c * 4, haze.hazeData[c], true);
            view.setFloat32(base + 112 + c * 4, haze.color[c], true);
          }
          bytes[base + 128] = BOX_INDICES[face][corner];
          bytes[base + 129] = haze.boneIndex & 0xff;
        }
      }
      this._cachedTransforms.push(transform);
    });

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    this._vertexBuffer = SharedGeometryBuffer(renderContext).Allocate(HAZE_VERTEX_SIZE, this._vertexCount, bytes, renderContext);
    if (!this._vertexBuffer) return false;

    Tr2Renderer.ReserveQuadListIndexBuffer(this._vertexCount / 4);
    return true;
  }

  /**
   * Carbon GetBatches (cpp:254-292): one additive batch of all the boxes,
   * indexed as quads, never in a reflection.
   */
  @carbon.method
  @impl.implemented
  GetBatches(accumulator, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE || !this._vertexBuffer || reason === Tr2RenderReason.TR2RENDERREASON_REFLECTION) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    if (!this.display || !this.effect) return;

    const indexBuffer = Tr2Renderer.GetQuadListIndexBuffer();
    if (!indexBuffer.IsValid()) return;

    const vertices = this._vertexBuffer;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, vertices.GetBuffer(), vertices.GetStride());
    batch.SetIndices(indexBuffer.GetBuffer(), indexBuffer.GetStride());
    batch.SetDrawIndexedInstanced(this._vertexCount / 2 * 3, 1, indexBuffer.GetStartIndex(), vertices.GetOffset() / vertices.GetStride(), 0);
    accumulator.Commit(batch);
  }

  /**
   * Carbon CreateBoundingBox (EveHazeSet.cpp:245-248): one delegation to the
   * shared item-set helper, always skinned.
   */
  @carbon.method
  @impl.implemented
  CreateBoundingBox()
  {
    CreateItemSetBoundingBoxes(this._staticBounds, this._boneBounds, true, this.hazes);
  }

  /** Carbon EveHazeSet::UpdateVisibility (cpp:208-218). Unlike the other sets
   * this one has no GetAabb of its own and never gates the bone count, because
   * its bounds are always built skinned. */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, bones = null, boneCount = 0)
  {
    const aabb = GetItemSetAabb(
      EveHazeSet._aabbScratch,
      this._staticBounds,
      this._boneBounds,
      bones,
      boneCount
    );
    if (box3.isEmpty(aabb))
    {
      return false;
    }

    box3.transformMat4(aabb, aabb, parentTransform);
    return !!updateContext?.GetFrustum()?.IsBoxVisible(aabb);
  }

  /**
   * Appends an authored haze item; the bounds only pick it up on the next
   * Rebuild.
   */
  @carbon.method
  @impl.implemented
  AddHazeItem(item)
  {
    this.hazes.push(item);
  }

  /**
   * Sets a shader option on the haze effect, doing nothing when no effect that
   * accepts options is attached.
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
   * Converts a SOF-authored light description into an EveHazeSetLight and
   * appends it to the set.
   */
  @carbon.method
  @impl.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveHazeSetLight.FromSOF(light));
  }

  /** Carbon EveHazeSet::RegisterComponents (cpp:394-401): LightOwner when
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

  /** Carbon EveHazeSet::UpdateLights (cpp:219-239): the shared packed-set
   * bone pattern (boneIndex > 0 only; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * BOTH activationStrength and boosterGain (cpp:237-238). */
  @carbon.method
  @impl.implemented
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

  /** Carbon EveHazeSet::GetLights (cpp:403-418): parentBrightness is set
   * INSIDE the loop (cpp:409) because boosterGainInfluence lights multiply
   * it by the booster gain (cpp:410-413); point conversion on the bone
   * matrix; no blink/fade, no gates. */
  @carbon.method
  @impl.adapted
  @impl.reason("Profile-index packing is by-reference per lightConversion.js conventions.")
  GetLights(lightManager)
  {
    const features = EveHazeSet._features;
    features.parentScale = 1;
    const quality = lightManager?.GetCurrentSpaceSceneShadowQuality() ?? 0;
    const record = EveHazeSet._lightRecord;

    for (const light of this.lights)
    {
      features.parentBrightness = this._activationStrength;
      if (light.boosterGainInfluence)
      {
        features.parentBrightness *= this._boosterGain;
      }
      AsPerPointLightData(record, light.lightData, light.boneMatrix, features, quality);
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
