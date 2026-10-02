// Source: trinity/trinity/Wod/WodPlaceableRes.h
// Source: trinity/trinity/Wod/WodPlaceableRes.cpp
// Source: trinity/trinity/Wod/WodPlaceableRes_Blue.cpp
import { meta } from "#schema";
import { vec3 } from "#math/vec3";

/** Authored placeable geometry, animations, fade distances and cached bounds. */
@meta.define({ className: "WodPlaceableRes", family: "wod" })
export class WodPlaceableRes
{
  /** Native visual model. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2Model")
  visualModel = null;

  /** Native squared far fade distance. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  farFadeDistance = 10000;

  /** Native squared near fade distance. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  nearFadeDistance = 2500;

  /** Curves animating the placeable graph. */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("TriCurveSet")
  curveSets = [];

  /** Whether this resource participates in shadow casting. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isShadowCaster = true;

  _minBounds = vec3.create();
  _maxBounds = vec3.create();
  _isReady = false;

  /** Returns the squared near fade distance. */
  @meta.blue.method
  @meta.implemented
  GetNearFadeDistance()
  {
    return this.nearFadeDistance;
  }

  /** Returns the squared far fade distance. */
  @meta.blue.method
  @meta.implemented
  GetFarFadeDistance()
  {
    return this.farFadeDistance;
  }

  /** Returns the visual model. */
  @meta.blue.method
  @meta.implemented
  GetVisualModel()
  {
    return this.visualModel;
  }

  /** Returns the live curve set collection. */
  @meta.blue.method
  @meta.implemented
  GetCurveSets()
  {
    return this.curveSets;
  }

  /** Returns the native shadow-caster flag. */
  @meta.blue.method
  @meta.implemented
  IsShadowCaster()
  {
    return this.isShadowCaster;
  }

  /** Delegates batch construction to the assigned model. */
  @meta.blue.method
  @meta.implemented
  GetBatches(batches, batchType, matrix, data)
  {
    if (this.visualModel) this.visualModel.GetBatches(batches, batchType, matrix, data);
  }

  /** Reports transparent areas, including hidden meshes as Carbon does. */
  @meta.blue.method
  @meta.implemented
  HasTransparency()
  {
    return this.visualModel ? this.visualModel.HasTransparency() : false;
  }

  /**
   * Caches bounds once every model mesh is ready. Carbon requires a visualModel
   * here; an incomplete authored graph is a contract error, not a ready resource.
   * Subsequent calls retain the native cache even if visualModel changes.
   */
  @meta.blue.method
  @meta.implemented
  IsReady()
  {
    if (this._isReady) return true;
    if (!this.visualModel.GetBoundingBox(this._minBounds, this._maxBounds)) return false;
    this._isReady = true;
    return true;
  }

  /** Copies cached bounds, attempting readiness first as in the native header. */
  @meta.blue.method
  @meta.implemented
  GetBoundingBox(min, max)
  {
    this.IsReady();
    vec3.copy(min, this._minBounds);
    vec3.copy(max, this._maxBounds);
  }
}

meta.blue.interfaceTable({ interfaces: [WodPlaceableRes], chainTo: null })(WodPlaceableRes);
