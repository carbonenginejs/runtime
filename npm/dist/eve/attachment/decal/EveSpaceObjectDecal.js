import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
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
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.int32, void 0, schema.enum("TriBatchType")], 16, "batchType"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "position"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.notify, io, io.persist, type, type.quat], 16, "rotation"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.int32], 16, "parentBoneIndex"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "decalEffect"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.array("unknown")], 16, "staticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyFrom"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPosition"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetRotation"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetScaling"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDecalMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInverseDecalMatrix"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetScaling"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBoneIndex"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetIndices"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetStaticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "HasStaticIndexBuffers"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDecalPrimitiveCounts"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMinScreenSize"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBatchType"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetPriority"]], 0, void 0, CjsModel));
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
