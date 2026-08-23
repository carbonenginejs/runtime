// Source: trinity/trinity/Eve/UI/EveUiObject.h
// Source: trinity/trinity/Eve/UI/EveUiObject.cpp
// Source: trinity/trinity/Eve/UI/EveUiObject_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { EveSpaceObject2 } from "../spaceObject/EveSpaceObject2.js";
import { TriBatchType } from "#consts/graphics";

/** Represents an Eve UI space object whose mesh areas can be shown, hidden, and identified from picking ids. */
@type.define({ className: "EveUiObject", family: "eve/ui" })
export class EveUiObject extends EveSpaceObject2
{

  /** m_usePerspectiveScale (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  usePerspectiveScale = true;

  /**
   * Enables or disables display on every mesh area carrying the given name,
   * across all batch types.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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

}
