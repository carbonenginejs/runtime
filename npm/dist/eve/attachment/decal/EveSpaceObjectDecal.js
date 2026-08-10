import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { box3 } from '@carbonenginejs/runtime-utils/box3';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { IEveSpaceObject2ParentData as _IEveSpaceObject2Pare } from '../../spaceObject/IEveSpaceObject2ParentData.js';
import { TriBatchType } from '../../../generated/trinityCore/enums.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_batchType, _init_extra_batchType, _init_position, _init_extra_position, _init_minScreenSize, _init_extra_minScreenSize, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_parentBoneIndex, _init_extra_parentBoneIndex, _init_decalEffect, _init_extra_decalEffect, _init_display, _init_extra_display, _init_staticIndexBuffers, _init_extra_staticIndexBuffers;

/**
 * A decal projected onto a parent hull, owning its oriented projection matrix,
 * optional bone attachment, per-LOD triangle index lists and screen-size
 * visibility ramp.
 */
let _EveSpaceObjectDecal;
new class extends _identity {
  static [class EveSpaceObjectDecal extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_batchType, _init_extra_batchType, _init_position, _init_extra_position, _init_minScreenSize, _init_extra_minScreenSize, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_parentBoneIndex, _init_extra_parentBoneIndex, _init_decalEffect, _init_extra_decalEffect, _init_display, _init_extra_display, _init_staticIndexBuffers, _init_extra_staticIndexBuffers, _initProto],
        c: [_EveSpaceObjectDecal, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpaceObjectDecal",
        family: "eve/attachment/decal"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.int32, void 0, type.enum("TriBatchType")], 16, "batchType"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.notify, io, io.persist, type, type.quat], 16, "rotation"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.int32], 16, "parentBoneIndex"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "decalEffect"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.array("unknown")], 16, "staticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyFrom"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetScaling"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDecalMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInverseDecalMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetScaling"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetIndices"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetStaticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "HasStaticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDecalPrimitiveCounts"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMinScreenSize"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBatchType"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetBoneMatrix"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads the m_isVisible member directly; JavaScript exposes the private runtime value through an accessor.")], 18, "GetVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetID"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetPickingBatches"]], 0, void 0, CjsModel));
    }
    /**
     * Establishes Carbon's opaque decal batch type after schema initialization,
     * because the schema's legacy TriBatchType default is 0.
     */
    constructor() {
      super();
      // The schema's legacy TriBatchType default is 0. Carbon's decal default is
      // the opaque batch (1), so establish it after model/schema initialization.
      this.batchType = 1;
    }
    name = (_initProto(this), _init_name(this, ""));
    batchType = (_init_extra_name(this), _init_batchType(this, 1));
    position = (_init_extra_batchType(this), _init_position(this, vec3.create()));
    minScreenSize = (_init_extra_position(this), _init_minScreenSize(this, 0));
    rotation = (_init_extra_minScreenSize(this), _init_rotation(this, quat.create()));
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));
    parentBoneIndex = (_init_extra_scaling(this), _init_parentBoneIndex(this, -1));
    decalEffect = (_init_extra_parentBoneIndex(this), _init_decalEffect(this, null));
    display = (_init_extra_decalEffect(this), _init_display(this, true));

    // SOF-authored per-LOD triangle indices; persisted so the values
    // interchange reproduces Carbon's hidden decal geometry selection.
    staticIndexBuffers = (_init_extra_display(this), _init_staticIndexBuffers(this, []));
    #decalMatrix = (_init_extra_staticIndexBuffers(this), mat4.create());
    #inverseDecalMatrix = mat4.create();
    #priority = 0;

    /** m_parentData (EveSpaceObjectDecal.h:178) - copied by value from the
     * owning space object each frame; zeroed with an identity transform by
     * Carbon's constructor (cpp:56-57). Runtime state, never persisted. */
    #parentData = new _IEveSpaceObject2Pare();

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
    #shLightingScratch = new Float32Array(_IEveSpaceObject2Pare.SH_COEFFICIENT_COUNT * 4);

    /**
     * Property form of HasStaticIndexBuffers: whether any LOD carries decal
     * triangle indices.
     */
    get hasStaticIndexBuffers() {
      return this.HasStaticIndexBuffers();
    }

    /**
     * Builds the decal matrix and its inverse from the authored position, rotation
     * and scaling; returns false when the composed matrix is not invertible.
     */
    Initialize() {
      return this.#updateDecalMatrix();
    }

    /**
     * Rebuilds the decal matrix and its inverse after an authored placement
     * change.
     */
    OnModified(_options = {}) {
      this.#updateDecalMatrix();
      return true;
    }

    /**
     * Copies another decal's authored description - name, display, placement, bone
     * index, minimum screen size, effect and batch type - and rebuilds the decal
     * matrix; the per-LOD index buffers are not copied. Returns false when source
     * is missing.
     */
    CopyFrom(source) {
      if (!source) return false;
      this.name = String(source.name ?? "");
      this.display = !!source.display;
      vec3.copy(this.position, source.position || _EveSpaceObjectDecal.#zero);
      quat.copy(this.rotation, source.rotation || _EveSpaceObjectDecal.#identityRotation);
      vec3.copy(this.scaling, source.scaling || _EveSpaceObjectDecal.#one);
      this.parentBoneIndex = Number(source.parentBoneIndex) | 0;
      this.minScreenSize = Number(source.minScreenSize) || 0;
      this.decalEffect = source.decalEffect ?? null;
      this.batchType = Number(source.batchType) | 0;
      return this.#updateDecalMatrix();
    }

    /**
     * Copies the authored decal position into the caller-owned out vector and
     * returns it.
     */
    GetPosition(out = vec3.create()) {
      return vec3.copy(out, this.position);
    }

    /**
     * Sets the authored decal position and rebuilds the decal matrix; a missing
     * value is taken as the origin.
     */
    SetPosition(value) {
      vec3.copy(this.position, value || _EveSpaceObjectDecal.#zero);
      return this.#updateDecalMatrix();
    }

    /**
     * Copies the authored decal rotation into the caller-owned out quaternion and
     * returns it.
     */
    GetRotation(out = quat.create()) {
      return quat.copy(out, this.rotation);
    }

    /**
     * Sets the authored decal rotation and rebuilds the decal matrix; a missing
     * value is taken as the identity rotation.
     */
    SetRotation(value) {
      quat.copy(this.rotation, value || _EveSpaceObjectDecal.#identityRotation);
      return this.#updateDecalMatrix();
    }

    /**
     * Copies the authored decal scaling into the caller-owned out vector and
     * returns it.
     */
    GetScaling(out = vec3.create()) {
      return vec3.copy(out, this.scaling);
    }

    /**
     * Copies the decal's projection matrix into out; the value is only current as
     * of the last Initialize, OnModified or placement setter.
     */
    GetDecalMatrix(out = mat4.create()) {
      return mat4.copy(out, this.#decalMatrix);
    }

    /**
     * Copies the inverse of the decal's projection matrix into out, which is what
     * maps hull-space positions into the decal's unit cube.
     */
    GetInverseDecalMatrix(out = mat4.create()) {
      return mat4.copy(out, this.#inverseDecalMatrix);
    }

    /**
     * Sets the authored decal scaling and rebuilds the decal matrix; a missing
     * value is taken as unit scale.
     */
    SetScaling(value) {
      vec3.copy(this.scaling, value || _EveSpaceObjectDecal.#one);
      return this.#updateDecalMatrix();
    }

    /**
     * The parent mesh bone the decal rides, or -1 when it rides the hull transform
     * directly.
     */
    GetBoneIndex() {
      return this.parentBoneIndex;
    }

    /**
     * Sets the parent mesh bone the decal rides; the bone matrix itself is only
     * picked up on the next SetBoneMatrix.
     */
    SetBoneIndex(index) {
      this.parentBoneIndex = Number(index) | 0;
      return true;
    }

    /**
     * Replaces the SOF-authored triangle index lists, one array per LOD, coercing
     * each entry to an unsigned integer.
     */
    SetIndices(indices) {
      this.staticIndexBuffers = Array.from(indices || [], lod => Array.from(lod || [], value => Number(value) >>> 0));
      return true;
    }

    /**
     * The per-LOD triangle index lists as fresh copies, so a caller cannot mutate
     * the stored buffers.
     */
    GetStaticIndexBuffers() {
      return this.staticIndexBuffers.map(lod => lod.slice());
    }

    /**
     * Whether any LOD carries triangle indices; a decal without them has no
     * geometry to draw.
     */
    HasStaticIndexBuffers() {
      return this.staticIndexBuffers.some(lod => lod.length > 0);
    }

    /** The triangle count per LOD, being each index list's length divided by three. */
    GetDecalPrimitiveCounts() {
      return this.staticIndexBuffers.map(lod => Math.trunc(lod.length / 3));
    }

    /**
     * Sets the LOD threshold in screen pixels below which UpdateVisibility culls
     * the decal; zero disables the test and makes the decal always visible.
     */
    SetMinScreenSize(value) {
      this.minScreenSize = Number(value) || 0;
      return true;
    }

    /** Sets the effect that draws the decal; a decal without one is never visible. */
    SetEffect(effect) {
      this.decalEffect = effect ?? null;
      return true;
    }

    /**
     * Sets a shader option on the decal effect; returns false when no effect that
     * accepts options is attached.
     */
    SetShaderOption(name, value) {
      if (!this.decalEffect?.SetOption) return false;
      this.decalEffect.SetOption(name, value);
      return true;
    }

    /**
     * Sets the TriBatchType the decal submits under, overriding the opaque default
     * the constructor establishes.
     */
    SetBatchType(value) {
      this.batchType = Number(value) | 0;
      return true;
    }

    /**
     * Sets the draw priority the engine sorts decals on; the value is runtime-only
     * and never persisted.
     */
    SetPriority(value) {
      this.#priority = Number(value) >>> 0;
      return true;
    }

    /** Carbon EveSpaceObjectDecal::SetBoneMatrix (cpp:475-491): expands the
     * parent's Float4x3 mesh bone at m_parentBoneIndex into the 4x4 bone matrix.
     * A -1 index or an out-of-range index leaves the identity in place. */
    SetBoneMatrix(boneMatrices, boneMatrixCount) {
      if (this.parentBoneIndex === -1 || this.parentBoneIndex >= boneMatrixCount) {
        return false;
      }
      const bone = boneMatrices?.[this.parentBoneIndex];
      if (!bone) return false;

      // Float4x3 is COLUMN-stride on the shared byte layout: each packed row is
      // (v0, v4, v8, v12) of the logical matrix (math skill gotcha 7), so the
      // expansion writes the transpose of the three packed rows back into the
      // 4x4 basis and leaves the last column as identity.
      const out = this.#parentBoneMatrix;
      for (let row = 0; row < 3; row++) {
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
    #CopyParentData(parentData) {
      if (this.#parentData.SetValues) this.#parentData.SetValues(parentData);else Object.assign(this.#parentData, parentData);
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
    UpdateVisibility(updateContext, parentData) {
      this.#isVisible = 0;
      if (!this.display || !this.decalEffect || !parentData) return false;
      if (!(this.minScreenSize > 0)) {
        this.#isVisible = 1;
        this.#CopyParentData(parentData);
        return true;
      }
      const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum ?? null;
      if (!frustum) return false;

      // Carbon (row-vector): m_parentBoneMatrix * parentData->transform - the
      // bone applies first, so the gl operands swap.
      const worldDecalMatrix = mat4.multiply(_EveSpaceObjectDecal.#worldDecalScratch, parentData.transform, this.#parentBoneMatrix);
      const bounds = box3.set(_EveSpaceObjectDecal.#boundsScratch, -1, -1, -1, 1, 1, 1);
      if (this.#instanceData) {
        // Instanced decals measure the geometry mesh bounds instead of the unit
        // cube (cpp:135-155). Carbon transforms only the two CORNERS here (not
        // the eight, as it does below), so this is vec3, not box3.transformMat4.
        // Carbon transforms only the two CORNERS here (not the eight, as it does
        // below). A mirroring transform swaps them, which Carbon leaves inverted
        // and box3 would read as EMPTY, so the pair is accumulated as points -
        // ordering it. The eight-corner transform below is indifferent to order,
        // so this only affects the mirrored-decal early-outs (parity note
        // divergence 7).
        const corner = _EveSpaceObjectDecal.#pointScratch;
        box3.empty(bounds);
        vec3.transformMat4(corner, this.#minBounds, worldDecalMatrix);
        box3.addPoint(bounds, bounds, corner);
        vec3.transformMat4(corner, this.#maxBounds, worldDecalMatrix);
        box3.addPoint(bounds, bounds, corner);
        if (box3.containsPoint(bounds, frustum.viewPos)) {
          this.#isVisible = 1;
          this.#CopyParentData(parentData);
          return true;
        }
        if (!frustum.IsBoxVisible?.(bounds)) {
          return false;
        }

        // Measure from the closest point of the box rather than its centre, so a
        // long box does not lod out while one end is near the camera.
        const offset = box3.getClampedPoint(_EveSpaceObjectDecal.#pointScratch, bounds, frustum.viewPos);
        vec3.subtract(offset, offset, frustum.viewPos);
        mat4.multiply(worldDecalMatrix, mat4.fromTranslation(_EveSpaceObjectDecal.#offsetScratch, offset), worldDecalMatrix);
      }

      // Carbon: m_decalMatrix * worldDecalMatrix - the decal applies first.
      mat4.multiply(worldDecalMatrix, worldDecalMatrix, this.#decalMatrix);
      box3.transformMat4(bounds, bounds, worldDecalMatrix);

      // Carbon's sphere is the box's circumscribing sphere: the centre of the
      // transformed box and HALF ITS FULL DIAGONAL (cpp:159-160).
      const center = _EveSpaceObjectDecal.#pointScratch;
      const radius = box3.toPositionRadius(bounds, center);
      const pixelSize = frustum.GetPixelSizeAccrossEst(center, radius);
      const modifiedMinScreen = this.minScreenSize * (updateContext?.GetLodFactor?.() ?? 1);
      if (pixelSize < modifiedMinScreen) return false;
      this.#isVisible = Math.min((pixelSize - modifiedMinScreen) / (modifiedMinScreen * 0.5), 1);
      this.#CopyParentData(parentData);
      return true;
    }

    /** The visibility fade Carbon writes to displayData.y; 0 when lodded out. */
    GetVisibility() {
      return this.#isVisible;
    }

    /** Carbon EveSpaceObjectDecal::HasTransparentBatches (cpp:241-244). */
    HasTransparentBatches() {
      return true;
    }

    /** Carbon EveSpaceObjectDecal::GetSortValue (cpp:337-340). */
    GetSortValue() {
      return 1;
    }

    /** Carbon ITr2Pickable::GetID is inline on the decal (h:113-116) and returns
     * the object itself; the area id selects nothing on this class. */
    GetID(_areaId) {
      return this;
    }

    /**
     * Carbon EveSpaceObjectDecal::GetPerObjectData (cpp:346-386): the
     * EveDecalPerObjectData composite - a DecalVSPerObjectData +
     * DecalPSPerObjectData pair uploaded as TWO constant buffers (cpp:975-976).
     * Here that is two Allocs returned as a { vs, ps } record.
     *
     * SetAndTranspose performs Carbon's Transpose. Carbon computes the two
     * inverses FROM the already-transposed matrices; because Inverse(M-transpose)
     * equals Inverse(M)-transpose (carbon-math-conventions F2), inverting the
     * logical matrix and letting the encoder transpose produces byte-identical
     * output with one transpose less work.
     */
    GetPerObjectData(accumulator) {
      const vs = accumulator.Alloc("DecalVSPerObjectData");
      const ps = accumulator.Alloc("DecalPSPerObjectData");
      const parentData = this.#parentData;
      vs.SetAndTranspose("worldMatrix", parentData.transform);
      // cpp:358 inverts the transposed world matrix in place; by F2 that is the
      // transpose of the logical inverse, so this is the same bytes.
      mat4.invert(this.#inverseParentBoneMatrix, parentData.transform);
      vs.SetAndTranspose("invWorldMatrix", this.#inverseParentBoneMatrix);
      vs.SetAndTranspose("decalMatrix", this.#decalMatrix);
      vs.SetAndTranspose("inverseDecalMatrix", this.#inverseDecalMatrix);
      vs.SetAndTranspose("parentBoneMatrix", this.#parentBoneMatrix);

      // cpp:366 - Inverse(Transpose(m_parentBoneMatrix)), recomputed per fill;
      // Carbon never reads its own m_invParentBoneMatrix member. Same F2
      // identity as above.
      mat4.invert(this.#inverseParentBoneMatrix, this.#parentBoneMatrix);
      vs.SetAndTranspose("invParentBoneMatrix", this.#inverseParentBoneMatrix);

      // cpp:374 - killCount is a uint widened to float; isVisible is the 0..1
      // visibility ramp; z and w are reserved literals.
      ps.Set("displayData", [parentData.killCount, this.#isVisible, 0, 0]);
      ps.Set("shipData", parentData.shipData);
      ps.Set("clipData", [parentData.clipSphereCenter[0], parentData.clipSphereCenter[1], parentData.clipSphereCenter[2], parentData.clipRadiusSq]);
      ps.Set("clipRadius2Sq", [parentData.clipRadius2Sq]);

      // cpp:376-383 - copy the parent's seven packed coefficients, or zero the
      // whole block when the parent supplied none. m_unused stays unwritten.
      const coefficients = this.#shLightingScratch;
      coefficients.fill(0);
      const shLighting = parentData.shLighting;
      if (shLighting) {
        for (let index = 0; index < coefficients.length && index < shLighting.length; index++) {
          coefficients[index] = shLighting[index];
        }
      }
      ps.Set("shLightingCoefficients", coefficients);
      return {
        vs,
        ps
      };
    }

    /** Carbon EveSpaceObjectDecal::GetBatches (cpp:250-331) submits the packed
     * decal index buffers against the device geometry resource. */
    GetBatches(_batches, _batchType, _perObjectData, _reason) {
      throw new Error("EveSpaceObjectDecal.GetBatches is not implemented in CarbonEngineJS.");
    }

    /** Carbon EveSpaceObjectDecal::GetPickingBatches (cpp:919-926) forwards to
     * GetBatches once the attachment pick-type mask passes. */
    GetPickingBatches(_batches, _pickTypes, _perObjectData) {
      throw new Error("EveSpaceObjectDecal.GetPickingBatches is not implemented in CarbonEngineJS.");
    }

    /**
     * Recomposes the decal matrix from the authored rotation, position and scaling
     * and inverts it; returns whether the inverse existed.
     */
    #updateDecalMatrix() {
      mat4.fromRotationTranslationScale(this.#decalMatrix, this.rotation, this.position, this.scaling);
      return !!mat4.invert(this.#inverseDecalMatrix, this.#decalMatrix);
    }

    /** Per-frame scratch - UpdateVisibility must not allocate. */
  }];
  #boundsScratch = box3.create();
  #worldDecalScratch = mat4.create();
  #offsetScratch = mat4.create();
  #pointScratch = vec3.create();
  #zero = vec3.create();
  #one = vec3.fromValues(1, 1, 1);
  #identityRotation = quat.create();
  TriBatchType = TriBatchType;
  constructor() {
    super(_EveSpaceObjectDecal), _initClass();
  }
}();

export { _EveSpaceObjectDecal as EveSpaceObjectDecal };
//# sourceMappingURL=EveSpaceObjectDecal.js.map
