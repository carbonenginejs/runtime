// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveSpaceObjectDecal.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveSpaceObjectDecal.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveSpaceObjectDecal_Blue.cpp
import { box3 } from "@carbonenginejs/runtime-utils/box3";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { IEveSpaceObject2ParentData } from "../../spaceObject/IEveSpaceObject2ParentData.js";
import { TriBatchType } from "../../../generated/trinityCore/enums.js";


@type.define({ className: "EveSpaceObjectDecal", family: "eve/attachment/decal" })
export class EveSpaceObjectDecal extends CjsModel
{
  constructor()
  {
    super();
    // The schema's legacy TriBatchType default is 0. Carbon's decal default is
    // the opaque batch (1), so establish it after model/schema initialization.
    this.batchType = 1;
  }

  @io.persist
  @type.string
  name = "";

  @io.read
  @type.int32
  @schema.enum("TriBatchType")
  batchType = 1;

  @io.notify
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.float32
  minScreenSize = 0;

  @io.notify
  @io.persist
  @type.quat
  rotation = quat.create();

  @io.notify
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.int32
  parentBoneIndex = -1;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  decalEffect = null;

  @io.readwrite
  @type.boolean
  display = true;

  // SOF-authored per-LOD triangle indices; persisted so the values
  // interchange reproduces Carbon's hidden decal geometry selection.
  @io.rebuild("packedGeometry")
  @io.persist
  @type.array("unknown")
  staticIndexBuffers = [];

  #decalMatrix = mat4.create();

  #inverseDecalMatrix = mat4.create();

  #priority = 0;

  /** m_parentData (EveSpaceObjectDecal.h:178) - copied by value from the
   * owning space object each frame; zeroed with an identity transform by
   * Carbon's constructor (cpp:56-57). Runtime state, never persisted. */
  #parentData = new IEveSpaceObject2ParentData();

  /** m_parentBoneMatrix (h:190) - the animated parent bone this decal rides,
   * identity until SetBoneMatrix supplies one. */
  #parentBoneMatrix = mat4.create();

  /** m_isVisible (h:204) - a float, not a bool: the non-LOD paths set exactly
   * 0 or 1 while the LOD path writes a 0..1 fade ramp (cpp:119-176). */
  #isVisible = 0;

  /** m_minBounds / m_maxBounds (h:215) - the geometry mesh bounds an instanced
   * decal measures instead of the unit cube. Stamped by the loader. */
  #minBounds = vec3.create();

  #maxBounds = vec3.create();

  /** m_instanceData (h:212) - non-null selects the instanced visibility path.
   * The instance buffer itself is engine-owned; the graph only needs to know
   * whether one is attached. */
  #instanceData = null;

  /** Carbon m_invParentBoneMatrix (h:191) is declared but never assigned; the
   * value the shader sees is recomputed per fill (cpp:366), so this port keeps
   * no member for it. */
  #inverseParentBoneMatrix = mat4.create();

  #shLightingScratch = new Float32Array(IEveSpaceObject2ParentData.SH_COEFFICIENT_COUNT * 4);

  get hasStaticIndexBuffers()
  {
    return this.HasStaticIndexBuffers();
  }

  @carbon.method
  @impl.adapted
  Initialize()
  {
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#updateDecalMatrix();
    return true;
  }

  @carbon.method
  @impl.adapted
  CopyFrom(source)
  {
    if (!source) return false;
    this.name = String(source.name ?? "");
    this.display = !!source.display;
    vec3.copy(this.position, source.position || EveSpaceObjectDecal.#zero);
    quat.copy(this.rotation, source.rotation || EveSpaceObjectDecal.#identityRotation);
    vec3.copy(this.scaling, source.scaling || EveSpaceObjectDecal.#one);
    this.parentBoneIndex = Number(source.parentBoneIndex) | 0;
    this.minScreenSize = Number(source.minScreenSize) || 0;
    this.decalEffect = source.decalEffect ?? null;
    this.batchType = Number(source.batchType) | 0;
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  @carbon.method
  @impl.adapted
  SetPosition(value)
  {
    vec3.copy(this.position, value || EveSpaceObjectDecal.#zero);
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetRotation(out = quat.create())
  {
    return quat.copy(out, this.rotation);
  }

  @carbon.method
  @impl.adapted
  SetRotation(value)
  {
    quat.copy(this.rotation, value || EveSpaceObjectDecal.#identityRotation);
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetScaling(out = vec3.create())
  {
    return vec3.copy(out, this.scaling);
  }

  @carbon.method
  @impl.adapted
  GetDecalMatrix(out = mat4.create())
  {
    return mat4.copy(out, this.#decalMatrix);
  }

  @carbon.method
  @impl.adapted
  GetInverseDecalMatrix(out = mat4.create())
  {
    return mat4.copy(out, this.#inverseDecalMatrix);
  }

  @carbon.method
  @impl.adapted
  SetScaling(value)
  {
    vec3.copy(this.scaling, value || EveSpaceObjectDecal.#one);
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetBoneIndex()
  {
    return this.parentBoneIndex;
  }

  @carbon.method
  @impl.adapted
  SetBoneIndex(index)
  {
    this.parentBoneIndex = Number(index) | 0;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetIndices(indices)
  {
    this.staticIndexBuffers = Array.from(indices || [], lod => Array.from(lod || [], value => Number(value) >>> 0));
    return true;
  }

  @carbon.method
  @impl.adapted
  GetStaticIndexBuffers()
  {
    return this.staticIndexBuffers.map(lod => lod.slice());
  }

  @carbon.method
  @impl.adapted
  HasStaticIndexBuffers()
  {
    return this.staticIndexBuffers.some(lod => lod.length > 0);
  }

  @carbon.method
  @impl.adapted
  GetDecalPrimitiveCounts()
  {
    return this.staticIndexBuffers.map(lod => Math.trunc(lod.length / 3));
  }

  @carbon.method
  @impl.adapted
  SetMinScreenSize(value)
  {
    this.minScreenSize = Number(value) || 0;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetEffect(effect)
  {
    this.decalEffect = effect ?? null;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (!this.decalEffect?.SetOption) return false;
    this.decalEffect.SetOption(name, value);
    return true;
  }

  @carbon.method
  @impl.adapted
  SetBatchType(value)
  {
    this.batchType = Number(value) | 0;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetPriority(value)
  {
    this.#priority = Number(value) >>> 0;
    return true;
  }

  /** Carbon EveSpaceObjectDecal::SetBoneMatrix (cpp:475-491): expands the
   * parent's Float4x3 mesh bone at m_parentBoneIndex into the 4x4 bone matrix.
   * A -1 index or an out-of-range index leaves the identity in place. */
  @carbon.method
  @impl.implemented
  SetBoneMatrix(boneMatrices, boneMatrixCount)
  {
    if (this.parentBoneIndex === -1 || this.parentBoneIndex >= boneMatrixCount)
    {
      return false;
    }

    const bone = boneMatrices?.[this.parentBoneIndex];
    if (!bone) return false;

    // Float4x3 is COLUMN-stride on the shared byte layout: each packed row is
    // (v0, v4, v8, v12) of the logical matrix (math skill gotcha 7), so the
    // expansion writes the transpose of the three packed rows back into the
    // 4x4 basis and leaves the last column as identity.
    const out = this.#parentBoneMatrix;
    for (let row = 0; row < 3; row++)
    {
      out[row] = bone[row * 4 + 0];
      out[4 + row] = bone[row * 4 + 1];
      out[8 + row] = bone[row * 4 + 2];
      out[12 + row] = bone[row * 4 + 3];
    }
    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;

    return true;
  }

  /** Carbon copies the parent data by value at the two points UpdateVisibility
   * accepts the decal (cpp:145, cpp:178). shLighting is a borrowed pointer into
   * the parent's own PS data, so it is carried by reference exactly as Carbon
   * carries the pointer. */
  #CopyParentData(parentData)
  {
    if (this.#parentData.SetValues) this.#parentData.SetValues(parentData);
    else Object.assign(this.#parentData, parentData);

    this.#parentData.shLighting = parentData.shLighting ?? null;
  }

  /**
   * Carbon EveSpaceObjectDecal::UpdateVisibility (cpp:117-179).
   *
   * `m_isVisible` is a FLOAT: zero when culled, one when no minimum screen
   * size is authored, otherwise a 0..1 fade ramp that reaches the shader as
   * displayData.y. The ramp has no lower clamp because the below-minimum case
   * already returned.
   *
   * On every cull path Carbon leaves m_parentData STALE - only the visibility
   * is cleared - so the copy happens solely on the accept paths.
   */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentData)
  {
    this.#isVisible = 0;

    if (!this.display || !this.decalEffect || !parentData) return false;

    if (!(this.minScreenSize > 0))
    {
      this.#isVisible = 1;
      this.#CopyParentData(parentData);
      return true;
    }

    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum ?? null;
    if (!frustum) return false;

    // Carbon (row-vector): m_parentBoneMatrix * parentData->transform - the
    // bone applies first, so the gl operands swap.
    const worldDecalMatrix = mat4.multiply(
      EveSpaceObjectDecal.#worldDecalScratch,
      parentData.transform,
      this.#parentBoneMatrix
    );
    const bounds = box3.set(EveSpaceObjectDecal.#boundsScratch, -1, -1, -1, 1, 1, 1);

    if (this.#instanceData)
    {
      // Instanced decals measure the geometry mesh bounds instead of the unit
      // cube (cpp:135-155). Carbon transforms only the two CORNERS here (not
      // the eight, as it does below), so this is vec3, not box3.transformMat4.
      // Carbon transforms only the two CORNERS here (not the eight, as it does
      // below). A mirroring transform swaps them, which Carbon leaves inverted
      // and box3 would read as EMPTY, so the pair is accumulated as points -
      // ordering it. The eight-corner transform below is indifferent to order,
      // so this only affects the mirrored-decal early-outs (parity note
      // divergence 7).
      const corner = EveSpaceObjectDecal.#pointScratch;
      box3.empty(bounds);
      vec3.transformMat4(corner, this.#minBounds, worldDecalMatrix);
      box3.addPoint(bounds, bounds, corner);
      vec3.transformMat4(corner, this.#maxBounds, worldDecalMatrix);
      box3.addPoint(bounds, bounds, corner);

      if (box3.containsPoint(bounds, frustum.viewPos))
      {
        this.#isVisible = 1;
        this.#CopyParentData(parentData);
        return true;
      }

      if (!frustum.IsBoxVisible?.(bounds))
      {
        return false;
      }

      // Measure from the closest point of the box rather than its centre, so a
      // long box does not lod out while one end is near the camera.
      const offset = box3.getClampedPoint(
        EveSpaceObjectDecal.#pointScratch,
        bounds,
        frustum.viewPos
      );
      vec3.subtract(offset, offset, frustum.viewPos);
      mat4.multiply(
        worldDecalMatrix,
        mat4.fromTranslation(EveSpaceObjectDecal.#offsetScratch, offset),
        worldDecalMatrix
      );
    }

    // Carbon: m_decalMatrix * worldDecalMatrix - the decal applies first.
    mat4.multiply(worldDecalMatrix, worldDecalMatrix, this.#decalMatrix);
    box3.transformMat4(bounds, bounds, worldDecalMatrix);

    // Carbon's sphere is the box's circumscribing sphere: the centre of the
    // transformed box and HALF ITS FULL DIAGONAL (cpp:159-160).
    const center = EveSpaceObjectDecal.#pointScratch;
    const radius = box3.toPositionRadius(bounds, center);
    const pixelSize = frustum.GetPixelSizeAccrossEst(center, radius);
    const modifiedMinScreen = this.minScreenSize * (updateContext?.GetLodFactor?.() ?? 1);

    if (pixelSize < modifiedMinScreen) return false;

    this.#isVisible = Math.min((pixelSize - modifiedMinScreen) / (modifiedMinScreen * 0.5), 1);
    this.#CopyParentData(parentData);
    return true;
  }

  /** The visibility fade Carbon writes to displayData.y; 0 when lodded out. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reads the m_isVisible member directly; JavaScript exposes the private runtime value through an accessor.")
  GetVisibility()
  {
    return this.#isVisible;
  }

  /** Carbon EveSpaceObjectDecal::HasTransparentBatches (cpp:241-244). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return true;
  }

  /** Carbon EveSpaceObjectDecal::GetSortValue (cpp:337-340). */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 1;
  }

  /** Carbon ITr2Pickable::GetID is inline on the decal (h:113-116) and returns
   * the object itself; the area id selects nothing on this class. */
  @carbon.method
  @impl.implemented
  GetID(_areaId)
  {
    return this;
  }

  /**
   * Carbon EveSpaceObjectDecal::GetPerObjectData (cpp:346-386): the
   * EveDecalPerObjectData composite - a DecalVSPerObjectData +
   * DecalPSPerObjectData pair uploaded as TWO constant buffers (cpp:975-976).
   * Here that is two Allocs returned as a { vs, ps } record.
   *
   * Set(MATRIX) performs Carbon's Transpose. The two inverses are taken from
   * the ALREADY-transposed matrices, matching Carbon exactly: Inverse of a
   * transpose is the transpose of the inverse, so they are written raw.
   */
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator)
  {
    const vs = accumulator.Alloc("DecalVSPerObjectData");
    const ps = accumulator.Alloc("DecalPSPerObjectData");
    const parentData = this.#parentData;

    vs.Set("worldMatrix", parentData.transform);
    // cpp:358 inverts the transposed world matrix in place, so the result is
    // already GPU-form and must bypass the encoder.
    mat4.transpose(this.#inverseParentBoneMatrix, parentData.transform);
    mat4.invert(this.#inverseParentBoneMatrix, this.#inverseParentBoneMatrix);
    vs.SetRaw("invWorldMatrix", this.#inverseParentBoneMatrix);

    vs.Set("decalMatrix", this.#decalMatrix);
    vs.Set("inverseDecalMatrix", this.#inverseDecalMatrix);
    vs.Set("parentBoneMatrix", this.#parentBoneMatrix);

    // cpp:366 - Inverse(Transpose(m_parentBoneMatrix)), recomputed per fill;
    // Carbon never reads its own m_invParentBoneMatrix member.
    mat4.transpose(this.#inverseParentBoneMatrix, this.#parentBoneMatrix);
    mat4.invert(this.#inverseParentBoneMatrix, this.#inverseParentBoneMatrix);
    vs.SetRaw("invParentBoneMatrix", this.#inverseParentBoneMatrix);

    // cpp:374 - killCount is a uint widened to float; isVisible is the 0..1
    // visibility ramp; z and w are reserved literals.
    ps.Set("displayData", [parentData.killCount, this.#isVisible, 0, 0]);
    ps.Set("shipData", parentData.shipData);
    ps.Set("clipData", [
      parentData.clipSphereCenter[0],
      parentData.clipSphereCenter[1],
      parentData.clipSphereCenter[2],
      parentData.clipRadiusSq
    ]);
    ps.Set("clipRadius2Sq", [parentData.clipRadius2Sq]);

    // cpp:376-383 - copy the parent's seven packed coefficients, or zero the
    // whole block when the parent supplied none. m_unused stays unwritten.
    const coefficients = this.#shLightingScratch;
    coefficients.fill(0);
    const shLighting = parentData.shLighting;
    if (shLighting)
    {
      for (let index = 0; index < coefficients.length && index < shLighting.length; index++)
      {
        coefficients[index] = shLighting[index];
      }
    }
    ps.Set("shLightingCoefficients", coefficients);

    return { vs, ps };
  }

  /** Carbon EveSpaceObjectDecal::GetBatches (cpp:250-331) submits the packed
   * decal index buffers against the device geometry resource. */
  @carbon.method
  @impl.notImplemented
  GetBatches(_batches, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveSpaceObjectDecal.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveSpaceObjectDecal::GetPickingBatches (cpp:919-926) forwards to
   * GetBatches once the attachment pick-type mask passes. */
  @carbon.method
  @impl.notImplemented
  GetPickingBatches(_batches, _pickTypes, _perObjectData)
  {
    throw new Error("EveSpaceObjectDecal.GetPickingBatches is not implemented in CarbonEngineJS.");
  }

  #updateDecalMatrix()
  {
    mat4.fromRotationTranslationScale(this.#decalMatrix, this.rotation, this.position, this.scaling);
    return !!mat4.invert(this.#inverseDecalMatrix, this.#decalMatrix);
  }

  /** Per-frame scratch - UpdateVisibility must not allocate. */
  static #boundsScratch = box3.create();

  static #worldDecalScratch = mat4.create();

  static #offsetScratch = mat4.create();

  static #pointScratch = vec3.create();

  static #zero = vec3.create();

  static #one = vec3.fromValues(1, 1, 1);

  static #identityRotation = quat.create();

  static TriBatchType = TriBatchType;

}
