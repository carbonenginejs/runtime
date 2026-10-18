import { ITr2LightOwner } from "../../lights/ITr2LightOwner.js";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.cpp
import { EveEntity } from "../../EveEntity.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { box3 } from "#math/box3";
import { mat3 } from "#math/mat3";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { IEveSpaceObjectAttachment } from "../IEveSpaceObjectAttachment.js";
import { EveHazeSetLight } from "./EveHazeSetLight.js";
import { EveComponentType } from "../../EntityComponents.js";
import { Tr2Light } from "../../lights/Tr2Light.js";
import { CreateLightRecord, MatrixCopyFrom3x4 } from "../../lights/lightConversion.js";
import { LightFeatures } from "../../lights/LightFeatures.js";
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
import { Tr2DeviceResource } from "../../../core/device/Tr2DeviceResource.js";
import { Tr2SuballocatedBufferAllocation } from "../../../core/device/Tr2SuballocatedBuffer/index.js";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

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
const DEBUG_LIGHT_COLOR = vec4.create();

/** The unit box Carbon draws for each haze (cpp:348-349). */
const DEBUG_BOX_MIN = vec3.fromValues(-0.5, -0.5, -0.5);
const DEBUG_BOX_MAX = vec3.fromValues(0.5, 0.5, 0.5);


/**
 * A hull's authored haze volumes, owning their per-bone bounds and the point
 * lights the haze emits.
 */
@blue.define("EveHazeSet")
@blue.inherit(IInitialize, Tr2DeviceResource, ITr2LightOwner, EveEntity)
@blue.interface(IInitialize, IEveSpaceObjectAttachment, EveEntity, ITr2LightOwner)
export class EveHazeSet extends IEveSpaceObjectAttachment
{

  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  effect = null;

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
  @type.list("EveHazeSetItem")
  hazes = [];

  @meta.persist
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

  /** m_vertexBuffer (h:110): the shared-buffer allocation, invalid until prepared. */
  _vertexBuffer = new Tr2SuballocatedBufferAllocation();

  /** m_cachedTransforms: each haze's local transform. */
  _cachedTransforms = [];

  /**
   * Carbon's constructor (cpp:62-70): registers with the device, as the
   * Tr2DeviceResource base constructor does (Tr2DeviceResource.cpp:6-9), so a
   * set initialized before the device exists gets its buffer once resources
   * can be created. Destroy unregisters it.
   */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /**
   * Carbon's destructor (cpp:76-78) is empty; what it releases is its
   * members' and bases': the m_vertexBuffer Allocation destructor frees the
   * shared-buffer range (Tr2SuballocatedBuffer.cpp:184-190) and the
   * Tr2DeviceResource destructor unregisters (Tr2DeviceResource.cpp:11-14).
   *
   * JavaScript has no deterministic destructor, so the owner calls this
   * explicitly. No owner calls Destroy yet.
   */
  Destroy()
  {
    if (this._vertexBuffer.IsValid()) this._vertexBuffer._parent.Free(this._vertexBuffer);
    TriDevice.UnregisterResource(this);
  }

  /** Sets the effect that draws the haze volumes. */
  @blue.method
  @meta.implemented
  Setup(effect)
  {
    this.effect = effect ?? null;
  }

  /** Carbon Initialize (cpp:77-82): the device half, then the bounds. */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  Rebuild()
  {
    this._rebuildRevision++;
    this.ReleaseResources(0);
    this.PrepareResources();
    this.CreateBoundingBox();
  }

  /**
   * Carbon ReleaseResources (cpp:105-109): forgets the vertex declaration and
   * frees the vertex range back to the shared buffer.
   *
   * Adapted: the allocation's own parent stands in for g_sharedBuffer, since
   * the shared buffer here is per render context (TriGeometryResAllocations).
   */
  @blue.method
  @meta.adapted
  ReleaseResources(_storage)
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    if (this._vertexBuffer.IsValid()) this._vertexBuffer._parent.Free(this._vertexBuffer);
  }

  /**
   * Carbon OnPrepareResources (cpp:117-203): the declaration, then 24
   * vertices per haze - each box face's four corners carrying the haze's
   * local transform and inverse as rows, its haze data and colour, the corner
   * index and bone index - into the shared buffer, and quad-list indices for
   * all of them.
   */
  @blue.method
  @meta.implemented
  OnPrepareResources()
  {
    this._cachedTransforms = [];

    if (this._vertexBuffer.IsValid()) return true;
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
    const allocation = SharedGeometryBuffer(renderContext).Allocate(HAZE_VERTEX_SIZE, this._vertexCount, bytes, renderContext);
    if (!allocation) return false;
    this._vertexBuffer = allocation;

    Tr2Renderer.ReserveQuadListIndexBuffer(this._vertexCount / 4);
    return true;
  }

  /**
   * Carbon GetBatches (cpp:254-292): one additive batch of all the boxes,
   * indexed as quads, never in a reflection.
   */
  @blue.method
  @meta.adapted
  GetBatches(accumulator, batchType, perObjectData, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE || !this._vertexBuffer.IsValid() || reason === Tr2RenderReason.TR2RENDERREASON_REFLECTION) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    if (!this.display || !this.effect) return;
    // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
    if (!this.effect.IsGood()) return;

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
  @blue.method
  @meta.implemented
  CreateBoundingBox()
  {
    CreateItemSetBoundingBoxes(this._staticBounds, this._boneBounds, true, this.hazes);
  }

  /** Carbon EveHazeSet::UpdateVisibility (cpp:208-218). Unlike the other sets
   * this one has no GetAabb of its own and never gates the bone count, because
   * its bounds are always built skinned. */
  @blue.method
  @meta.implemented
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
    return updateContext.GetFrustum().IsBoxVisible(aabb);
  }

  /**
   * Appends an authored haze item; the bounds only pick it up on the next
   * Rebuild.
   */
  @blue.method
  @meta.implemented
  AddHazeItem(item)
  {
    this.hazes.push(item);
  }

  /**
   * Carbon EveHazeSet::GetDebugOptions (cpp:319-323).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Haze Sets");
    options.add("Haze Sets Lights");
  }

  /**
   * Carbon EveHazeSet::RenderDebugInfo (cpp:326-381): two independent options.
   *
   * "Haze Sets" draws every haze as a unit box twice - wireframe, then solid
   * with a zero colour - owned by the haze. A haze with a bone in range has its
   * position moved through the bone and its rotation followed by the bone's
   * rotation before the box transform is built; an out-of-range bone is
   * silently ignored (no colour change, unlike the banner and sprite sets).
   *
   * "Haze Sets Lights" draws each light twice, inner then outer radius, owned
   * by the light's haze.
   * @param {ITr2DebugRenderer2} renderer
   * @param {mat4} parentTransform
   * @param {Float32Array|null} bones Packed Float4x3 bone matrices.
   * @param {number} boneCount
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, bones, boneCount)
  {
    if (renderer.HasOption(this, "Haze Sets"))
    {
      for (const haze of this.hazes)
      {
        const boneIndex = haze.boneIndex;
        const rotation = quat.copy(DEBUG_ROTATION, haze.rotation);
        const position = vec3.copy(DEBUG_POSITION, haze.position);

        if (boneIndex > -1 && boneIndex < boneCount)
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
        const t = mat4.fromRotationTranslationScale(DEBUG_TRANSFORM, rotation, position, haze.scaling);
        // Carbon (row-vector): t * parentTransform.
        const world = mat4.multiply(DEBUG_WORLD, parentTransform, t);

        renderer.DrawBox__Transform(
          Tr2DebugObjectReference.create__Object(haze),
          world,
          DEBUG_BOX_MIN,
          DEBUG_BOX_MAX,
          ITr2DebugRenderer2.Effect.Wireframe,
          Tr2DebugColor.create__Uint32ZFail(0xff00ffff, 0x2200ffff));
        renderer.DrawBox__Transform(
          Tr2DebugObjectReference.create__Object(haze),
          world,
          DEBUG_BOX_MIN,
          DEBUG_BOX_MAX,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Uint32(0));
      }
    }

    if (renderer.HasOption(this, "Haze Sets Lights"))
    {
      for (const l of this.lights)
      {
        const t = mat4.fromTranslation(DEBUG_TRANSFORM, l.lightData.position);
        // Carbon (row-vector): TranslationMatrix( l.lightData.position ) * l.boneMatrix.
        mat4.multiply(t, l.boneMatrix, t);

        const c = vec4.copy(DEBUG_LIGHT_COLOR, l.lightData.color);

        c[3] = 0.5;

        // Carbon quirk (cpp:361): `>` not `>=`, so an index equal to the haze
        // count reads one past the end; reproduced as an undefined read.
        const hazeItem = l.index > this.hazes.length ? null : this.hazes[l.index];

        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(hazeItem),
          t,
          l.lightData.innerRadius,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));

        c[3] = 0.3;
        renderer.DrawSphere__TransformRadius(
          Tr2DebugObjectReference.create__Object(hazeItem),
          t,
          l.lightData.radius,
          10,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Color(c));
      }
    }
  }

  /**
   * Sets a shader option on the haze effect, doing nothing when no effect is attached.
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
   * Converts a SOF-authored light description into an EveHazeSetLight and
   * appends it to the set.
   */
  @blue.method
  @meta.adapted
  AddLightFromSOF(light)
  {
    this.lights.push(EveHazeSetLight.FromSOF(light));
  }

  /** Carbon EveHazeSet::RegisterComponents (cpp:394-401): LightOwner when
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

  /** Carbon EveHazeSet::UpdateLights (cpp:219-239): the shared packed-set
   * bone pattern (boneIndex >= 0; column-stride Float4x3 unpack; 4th
   * column zeroed, [15] = 1; boneMatrix *= parentTransform - Carbon
   * row-vector, bone FIRST: gl operands SWAP; else copy the parent). Stamps
   * BOTH activationStrength and boosterGain (cpp:237-238).
   *
   * Adapted: Carbon skips bone 0 here (EveHazeSet.cpp:223; CE-27), so a light on binding 0
   * gets only the parent transform. Binding 0 is a mesh bone binding and can
   * be animated - the Bowhead (orecs2_t1) moves its MASTER binding through
   * Normal2Warp - so ours applies bone 0 like any other. */
  @blue.method
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

  /** Carbon EveHazeSet::GetLights (cpp:403-418): parentBrightness is set
   * INSIDE the loop (cpp:409) because boosterGainInfluence lights multiply
   * it by the booster gain (cpp:410-413); point conversion on the bone
   * matrix; no blink/fade, no gates.
   *
   * Adapted: Profile-index packing is by-reference per lightConversion.js conventions.
   */
  @blue.method
  @meta.adapted
  GetLights(lightManager)
  {
    const features = EveHazeSet._features;
    features.parentScale = 1;
    const quality = lightManager.GetCurrentSpaceSceneShadowQuality();
    const record = EveHazeSet._lightRecord;

    for (const light of this.lights)
    {
      features.parentBrightness = this._activationStrength;
      if (light.boosterGainInfluence)
      {
        features.parentBrightness *= this._boosterGain;
      }
      light.lightData.AsPerPointLightData(light.boneMatrix, features, quality, record);
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

// EveHazeSet_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
