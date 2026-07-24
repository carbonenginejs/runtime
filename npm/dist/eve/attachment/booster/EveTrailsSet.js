import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_geometryResource, _init_extra_geometryResource, _init_fadeSpeed, _init_extra_fadeSpeed, _init_effect, _init_extra_effect, _init_geometryResPath, _init_extra_geometryResPath, _init_display, _init_extra_display;
let _EveTrailsSet;
class EveTrailsSet extends CjsModel {
  static {
    ({
      e: [_init_geometryResource, _init_extra_geometryResource, _init_fadeSpeed, _init_extra_fadeSpeed, _init_effect, _init_extra_effect, _init_geometryResPath, _init_extra_geometryResPath, _init_display, _init_extra_display, _initProto],
      c: [_EveTrailsSet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveTrailsSet",
      family: "eve/attachment/boosters"
    })], [[[io, io.read, void 0, type.objectRef("TriGeometryRes")], 16, "geometryResource"], [[io, io.persist, type, type.float32], 16, "fadeSpeed"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[void 0, io.rebuild("geometry"), io, io.notify, io, io.persist, type, type.string], 16, "geometryResPath"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "Clear"], [[carbon, carbon.method, impl, impl.implemented], 18, "Add"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFadeSpeed"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMeshResPath"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetGeometryResource"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetTrailData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRevision"]], 0, void 0, CjsModel));
  }
  /** m_geometryResource (TriGeometryResPtr) [READ] */
  geometryResource = (_initProto(this), _init_geometryResource(this, null));

  /** m_fadeSpeed (float) [READWRITE, PERSIST] */
  fadeSpeed = (_init_extra_geometryResource(this), _init_fadeSpeed(this, 1));

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  effect = (_init_extra_fadeSpeed(this), _init_effect(this, null));

  /** m_geometryResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  geometryResPath = (_init_extra_effect(this), _init_geometryResPath(this, ""));

  /** m_display (bool) [READWRITE] */
  display = (_init_extra_geometryResPath(this), _init_display(this, true));
  #trailData = (_init_extra_display(this), []);
  #revision = 0;
  Initialize() {
    this.#revision++;
    return true;
  }
  OnModified() {
    this.#revision++;
    return true;
  }
  Update() {}
  Clear() {
    this.#trailData.length = 0;
    this.#revision++;
  }
  Add(localMatrix, size) {
    if (!localMatrix || localMatrix.length !== 16) {
      throw new TypeError("EveTrailsSet transforms must contain 16 values");
    }
    this.#trailData.push({
      transform: mat4.clone(localMatrix),
      size: Number(size) || 0
    });
    this.#revision++;
  }
  GetFadeSpeed() {
    return this.fadeSpeed;
  }
  SetEffect(effect) {
    this.effect = effect ?? null;
  }
  SetMeshResPath(path) {
    this.geometryResPath = String(path ?? "");
    this.#revision++;
  }
  SetGeometryResource(resource) {
    if (this.geometryResource !== resource) {
      this.geometryResource = resource ?? null;
      this.#revision++;
    }
  }
  GetTrailData() {
    return this.#trailData.map(trail => ({
      transform: mat4.clone(trail.transform),
      size: trail.size
    }));
  }
  GetRevision() {
    return this.#revision;
  }
  static {
    _initClass();
  }
}

export { _EveTrailsSet as EveTrailsSet };
//# sourceMappingURL=EveTrailsSet.js.map
