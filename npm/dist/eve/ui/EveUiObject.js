import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSpaceObject2 as _EveSpaceObject } from '../spaceObject/EveSpaceObject2.js';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';

let _initProto, _initClass, _init_usePerspectiveScale, _init_extra_usePerspectiveScale;

/** EveUiObject (eve/ui) - generated from schema shapeHash ea8f8922.... */
let _EveUiObject;
class EveUiObject extends _EveSpaceObject {
  static {
    ({
      e: [_init_usePerspectiveScale, _init_extra_usePerspectiveScale, _initProto],
      c: [_EveUiObject, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveUiObject",
      family: "eve/ui"
    })], [[[io, io.readwrite, type, type.boolean], 16, "usePerspectiveScale"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetVisibilityForArea"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetNameForPickingAreaID"]], 0, void 0, _EveSpaceObject));
  }
  constructor(...args) {
    super(...args);
    _init_extra_usePerspectiveScale(this);
  }
  /** m_usePerspectiveScale (bool) [READWRITE] */
  usePerspectiveScale = (_initProto(this), _init_usePerspectiveScale(this, true));

  /**
   * Enables or disables display on every mesh area carrying the given name,
   * across all batch types.
   */
  SetVisibilityForArea(areaName, enable) {
    const mesh = this.GetMesh();
    if (!mesh) return;
    for (let areaType = 0; areaType < TriBatchType.TRIBATCHTYPE_COUNT_OF_BATCH_TYPES; areaType++) {
      const areas = mesh.GetAreas(areaType);
      if (!areas) continue;
      for (const area of areas) {
        if (area.GetName() === areaName) {
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
  GetNameForPickingAreaID(areaID) {
    const mesh = this.GetMesh();
    if (!mesh) return "invalid_mesh";
    const pickingAreas = mesh.GetAreas(TriBatchType.TRIBATCHTYPE_PICKING);
    if (pickingAreas) {
      for (const area of pickingAreas) {
        if (area.GetIndex() === areaID) {
          return area.GetName();
        }
      }
    }
    return "invalid_areaid";
  }
  static {
    _initClass();
  }
}

export { _EveUiObject as EveUiObject };
//# sourceMappingURL=EveUiObject.js.map
