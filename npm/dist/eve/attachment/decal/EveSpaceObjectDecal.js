import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { IEveSpaceObject2ParentData as _IEveSpaceObject2Pare } from '../../spaceObject/IEveSpaceObject2ParentData.js';
import { TriBatchType } from '../../../generated/trinityCore/enums.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_batchType, _init_extra_batchType, _init_position, _init_extra_position, _init_minScreenSize, _init_extra_minScreenSize, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_parentBoneIndex, _init_extra_parentBoneIndex, _init_decalEffect, _init_extra_decalEffect, _init_display, _init_extra_display, _init_staticIndexBuffers, _init_extra_staticIndexBuffers;
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
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.int32, void 0, schema.enum("TriBatchType")], 16, "batchType"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.notify, io, io.persist, type, type.quat], 16, "rotation"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.int32], 16, "parentBoneIndex"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "decalEffect"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.array("unknown")], 16, "staticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyFrom"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetScaling"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDecalMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInverseDecalMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetScaling"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetIndices"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetStaticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "HasStaticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDecalPrimitiveCounts"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMinScreenSize"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBatchType"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetBoneMatrix"], [[carbon, carbon.method, impl, impl.custom, void 0, impl.reason("Carbon copies the parent data inside UpdateVisibility, whose frustum and LOD-fade paths remain unported; exposing the copy keeps the per-object fill exact meanwhile.")], 18, "SetParentData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetID"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetPickingBatches"]], 0, void 0, CjsModel));
    }
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

    /** Carbon m_invParentBoneMatrix (h:191) is declared but never assigned; the
     * value the shader sees is recomputed per fill (cpp:366), so this port keeps
     * no member for it. */
    #inverseParentBoneMatrix = mat4.create();
    #shLightingScratch = new Float32Array(_IEveSpaceObject2Pare.SH_COEFFICIENT_COUNT * 4);
    get hasStaticIndexBuffers() {
      return this.HasStaticIndexBuffers();
    }
    Initialize() {
      return this.#updateDecalMatrix();
    }
    OnModified(_options = {}) {
      this.#updateDecalMatrix();
      return true;
    }
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
    GetPosition(out = vec3.create()) {
      return vec3.copy(out, this.position);
    }
    SetPosition(value) {
      vec3.copy(this.position, value || _EveSpaceObjectDecal.#zero);
      return this.#updateDecalMatrix();
    }
    GetRotation(out = quat.create()) {
      return quat.copy(out, this.rotation);
    }
    SetRotation(value) {
      quat.copy(this.rotation, value || _EveSpaceObjectDecal.#identityRotation);
      return this.#updateDecalMatrix();
    }
    GetScaling(out = vec3.create()) {
      return vec3.copy(out, this.scaling);
    }
    GetDecalMatrix(out = mat4.create()) {
      return mat4.copy(out, this.#decalMatrix);
    }
    GetInverseDecalMatrix(out = mat4.create()) {
      return mat4.copy(out, this.#inverseDecalMatrix);
    }
    SetScaling(value) {
      vec3.copy(this.scaling, value || _EveSpaceObjectDecal.#one);
      return this.#updateDecalMatrix();
    }
    GetBoneIndex() {
      return this.parentBoneIndex;
    }
    SetBoneIndex(index) {
      this.parentBoneIndex = Number(index) | 0;
      return true;
    }
    SetIndices(indices) {
      this.staticIndexBuffers = Array.from(indices || [], lod => Array.from(lod || [], value => Number(value) >>> 0));
      return true;
    }
    GetStaticIndexBuffers() {
      return this.staticIndexBuffers.map(lod => lod.slice());
    }
    HasStaticIndexBuffers() {
      return this.staticIndexBuffers.some(lod => lod.length > 0);
    }
    GetDecalPrimitiveCounts() {
      return this.staticIndexBuffers.map(lod => Math.trunc(lod.length / 3));
    }
    SetMinScreenSize(value) {
      this.minScreenSize = Number(value) || 0;
      return true;
    }
    SetEffect(effect) {
      this.decalEffect = effect ?? null;
      return true;
    }
    SetShaderOption(name, value) {
      if (!this.decalEffect?.SetOption) return false;
      this.decalEffect.SetOption(name, value);
      return true;
    }
    SetBatchType(value) {
      this.batchType = Number(value) | 0;
      return true;
    }
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

    /** The parent-state copy Carbon performs inside UpdateVisibility
     * (cpp:145/178). Split out as its own seam because UpdateVisibility's
     * frustum, screen-size and LOD-fade work is not ported yet; the visibility
     * factor is supplied explicitly so the per-object fill stays faithful. */
    SetParentData(parentData, isVisible = 1) {
      if (!parentData) return false;
      this.#parentData.SetValues ? this.#parentData.SetValues(parentData) : Object.assign(this.#parentData, parentData);
      this.#parentData.shLighting = parentData.shLighting ?? null;
      this.#isVisible = Number(isVisible) || 0;
      return true;
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
     * Set(MATRIX) performs Carbon's Transpose. The two inverses are taken from
     * the ALREADY-transposed matrices, matching Carbon exactly: Inverse of a
     * transpose is the transpose of the inverse, so they are written raw.
     */
    GetPerObjectData(accumulator) {
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
    #updateDecalMatrix() {
      mat4.fromRotationTranslationScale(this.#decalMatrix, this.rotation, this.position, this.scaling);
      return !!mat4.invert(this.#inverseDecalMatrix, this.#decalMatrix);
    }
  }];
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
