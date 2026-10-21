import { exposure as be } from "#be";
// Source: trinity/trinity/Wod/WodPlaceableRes.h
// Source: trinity/trinity/Wod/WodPlaceableRes.cpp
// Source: trinity/trinity/Wod/WodPlaceableRes_Blue.cpp
import { meta, type, blue } from "#schema";
import { IRoot } from "#blue";
import { vec3 } from "#math/vec3";

/** Authored placeable geometry, animations, fade distances and cached bounds. */
@be.define("WodPlaceableRes")

@blue.inherit(IRoot)
export class WodPlaceableRes
{
  /** Native visual model. */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Model")
  visualModel = null;

  /** Native squared far fade distance. */
  @blue.readwrite
  @blue.persist
  @type.float32
  farFadeDistance = 10000;

  /** Native squared near fade distance. */
  @blue.readwrite
  @blue.persist
  @type.float32
  nearFadeDistance = 2500;

  /** Curves animating the placeable graph. */
  @blue.read
  @blue.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** Whether this resource participates in shadow casting. */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isShadowCaster = true;

  _minBounds = vec3.create();
  _maxBounds = vec3.create();
  _isReady = false;

  /** Returns the squared near fade distance. */
  @blue.method
  @meta.implemented
  GetNearFadeDistance()
  {
    return this.nearFadeDistance;
  }

  /** Returns the squared far fade distance. */
  @blue.method
  @meta.implemented
  GetFarFadeDistance()
  {
    return this.farFadeDistance;
  }

  /** Returns the visual model. */
  @blue.method
  @meta.implemented
  GetVisualModel()
  {
    return this.visualModel;
  }

  /** Returns the live curve set collection. */
  @blue.method
  @meta.implemented
  GetCurveSets()
  {
    return this.curveSets;
  }

  /** Returns the native shadow-caster flag. */
  @blue.method
  @meta.implemented
  IsShadowCaster()
  {
    return this.isShadowCaster;
  }

  /** Delegates batch construction to the assigned model. */
  @blue.method
  @meta.implemented
  GetBatches(batches, batchType, matrix, data)
  {
    if (this.visualModel) this.visualModel.GetBatches(batches, batchType, matrix, data);
  }

  /** Reports transparent areas, including hidden meshes as Carbon does. */
  @blue.method
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
  @blue.method
  @meta.implemented
  IsReady()
  {
    if (this._isReady) return true;
    if (!this.visualModel.GetBoundingBox(this._minBounds, this._maxBounds)) return false;
    this._isReady = true;
    return true;
  }

  /** Copies cached bounds, attempting readiness first as in the native header. */
  @blue.method
  @meta.implemented
  GetBoundingBox(min, max)
  {
    this.IsReady();
    vec3.copy(min, this._minBounds);
    vec3.copy(max, this._maxBounds);
  }
}

