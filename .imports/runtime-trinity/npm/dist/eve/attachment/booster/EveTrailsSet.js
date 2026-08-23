import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_geometryResource, _init_extra_geometryResource, _init_fadeSpeed, _init_extra_fadeSpeed, _init_effect, _init_extra_effect, _init_geometryResPath, _init_extra_geometryResPath, _init_display, _init_extra_display;

/**
 * Holds the booster trail placements a hull emits, together with the mesh
 * resource and effect a renderer draws them with.
 */
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

  /** Bumps the revision so an adapter re-reads the trail data on its next pass. */
  Initialize() {
    this.#revision++;
    return true;
  }

  /**
   * Bumps the revision after a property change so an adapter re-reads the trail
   * data.
   */
  OnModified() {
    this.#revision++;
    return true;
  }

  /**
   * Accepts the per-frame update; the set itself holds no time-varying state,
   * because trail motion lives on each booster renderable's spline.
   */
  Update() {}

  /** Drops every trail placement and bumps the revision. */
  Clear() {
    this.#trailData.length = 0;
    this.#revision++;
  }

  /**
   * Appends a trail placement with its size, cloning the transform; throws a
   * TypeError when localMatrix is not sixteen values.
   */
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

  /** The authored rate at which a trail fades out behind its booster. */
  GetFadeSpeed() {
    return this.fadeSpeed;
  }

  /** Sets the effect that draws the trails. */
  SetEffect(effect) {
    this.effect = effect ?? null;
  }

  /**
   * Sets the trail mesh resource path and bumps the revision; resolving the path
   * to a resource is the host's job.
   */
  SetMeshResPath(path) {
    this.geometryResPath = String(path ?? "");
    this.#revision++;
  }

  /**
   * Attaches a resolved trail geometry resource, bumping the revision only when
   * the resource actually changes.
   */
  SetGeometryResource(resource) {
    if (this.geometryResource !== resource) {
      this.geometryResource = resource ?? null;
      this.#revision++;
    }
  }

  /**
   * The trail placements as deep copies, safe for an adapter to keep past the
   * next Clear or Add.
   */
  GetTrailData() {
    return this.#trailData.map(trail => ({
      transform: mat4.clone(trail.transform),
      size: trail.size
    }));
  }

  /**
   * A counter bumped whenever the trail placements, mesh path or geometry
   * resource change, so an adapter can tell its packed data is stale.
   */
  GetRevision() {
    return this.#revision;
  }
  static {
    _initClass();
  }
}

export { _EveTrailsSet as EveTrailsSet };
//# sourceMappingURL=EveTrailsSet.js.map
