import { exposure as be } from "#be";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";
// Source: trinity/trinity/Eve/UI/EveUiObject.h
// Source: trinity/trinity/Eve/UI/EveUiObject.cpp
// Source: trinity/trinity/Eve/UI/EveUiObject_Blue.cpp
import { meta, type, blue } from "#schema";
import { EveSpaceObject2 } from "../spaceObject/EveSpaceObject2.js";
import { TriBatchType } from "#consts/graphics";
import { Tr2Lod } from "#consts/trinity";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";

/**
 * Carbon's EveUiObject: a space object drawn as part of the UI. It is never
 * culled and never drops detail - every visibility update ends visible, at
 * high LOD and without an impostor - and with usePerspectiveScale off it is
 * scaled by its camera distance so it keeps a constant on-screen size. Its
 * mesh areas can be shown, hidden, and identified from picking ids.
 */
@be.define("EveUiObject")
@be.mapInterface(IEveSpaceObject2)
@be.exposureChainTo(EveSpaceObject2)
export class EveUiObject extends EveSpaceObject2
{

  /** m_usePerspectiveScale (bool) [READWRITE] - EveUiObject_Blue.cpp:14; true from the constructor (cpp:10-14). */
  @blue.readwrite
  @type.boolean
  usePerspectiveScale = true;

  /**
   * Carbon UpdateWorldTransform (EveUiObject.cpp:21-34): the space object's
   * world transform, then, without perspective scaling, a uniform scale by
   * the distance from the view position to the world position, applied
   * first, in the object's own space - so the translation is unchanged.
   *
   * Carbon quirk (CE-190), reproduced: the scale is applied even when the base
   * returned early because the transform was already built for this time
   * (EveSpaceObject2.cpp:3055-3058), so a second update in one frame - as
   * UpdateModelCenterWorldPosition makes (cpp:2992-2995) - scales the
   * already-scaled transform again. Carbon quirk (CE-191): the inverse world
   * transform the base computed is not refreshed, so it stays unscaled.
   *
   * Adapted: Carbon returns nothing; this returns the base's JavaScript result.
   *
   * @param {number} time Frame time in Blue ticks.
   * @returns {boolean} False when the base had already built the transform for this time.
   */
  @blue.method
  @meta.adapted
  UpdateWorldTransform(time)
  {
    const updated = super.UpdateWorldTransform(time);

    if (!this.usePerspectiveScale)
    {
      // add a scaling to the worldmatrix based on camera distance to make this guy not perspective
      const { vec3_0 } = EveUiObject.scratch;
      // vec3_0 is d, then the scaling vector
      vec3.subtract(vec3_0, this.worldPosition, Tr2Renderer.GetViewPosition());
      const dist = vec3.length(vec3_0);

      vec3.set(vec3_0, dist, dist, dist);
      // Carbon (row-vector): scaleMatrix * m_worldTransform - scale first, then the world transform.
      // gl's post-multiply mat4.scale( W, W, s ) builds W . S, which is that order.
      mat4.scale(this.worldTransform, this.worldTransform, vec3_0);
    }
    return updated;
  }

  /**
   * Carbon UpdateVisibility (EveUiObject.cpp:37-47): the space object's
   * visibility update, after which a UI model has no LOD: visible, mesh
   * visible and in the frustum, at TR2_LOD_HIGH with and without children,
   * and not an impostor, whatever was calculated.
   *
   * Carbon quirk (CE-192), reproduced: the forced state also holds for a hidden object,
   * for which the base returns before computing anything
   * (EveSpaceObject2.cpp:1596-1599); display still gates its renderables.
   *
   * Adapted: Carbon returns nothing; this returns isVisible, as the JavaScript
   * base does.
   *
   * @param {EveUpdateContext} updateContext The frame context.
   * @param {mat4} parentTransform The parent's transform.
   * @returns {boolean} isVisible, always true.
   */
  @blue.method
  @meta.adapted
  UpdateVisibility(updateContext, parentTransform)
  {
    super.UpdateVisibility(updateContext, parentTransform);

    // no matter what gets calculated, ui models have NO lod
    this.isVisible = this._isMeshVisible = this._isInFrustum = true;
    this.lodLevel = Tr2Lod.TR2_LOD_HIGH;
    this._lodLevelWithChildren = Tr2Lod.TR2_LOD_HIGH;
    this._impostorMode = false;
    return this.isVisible;
  }

  /**
   * Enables or disables display on every mesh area carrying the given name,
   * across all batch types.
   */
  @blue.method
  @meta.implemented
  SetVisibilityForArea(areaName, enable)
  {
    const mesh = this.GetMesh();
    if (!mesh) return;

    for (let areaType = 0; areaType < TriBatchType.TRIBATCHTYPE_COUNT_OF_BATCH_TYPES; areaType++)
    {
      const areas = mesh.GetAreas(areaType);
      if (!areas) continue;
      for (const area of areas)
      {
        if (area.GetName() === areaName)
        {
          area.SetDisplay(enable);
        }
      }
    }
  }

  /**
   * Maps a picking area index back to its area name, returning "invalid_mesh"
   * when there is no mesh and "invalid_areaid" when no picking area has that
   * index.
   */
  @blue.method
  @meta.implemented
  GetNameForPickingAreaID(areaID)
  {
    const mesh = this.GetMesh();
    if (!mesh) return "invalid_mesh";

    const pickingAreas = mesh.GetAreas(TriBatchType.TRIBATCHTYPE_PICKING);
    if (pickingAreas)
    {
      for (const area of pickingAreas)
      {
        if (area.GetIndex() === areaID)
        {
          return area.GetName();
        }
      }
    }
    return "invalid_areaid";
  }

  static scratch = {
    vec3_0: vec3.create()
  };

}
