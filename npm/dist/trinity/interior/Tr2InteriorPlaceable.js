import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_placeableResPath, _init_extra_placeableResPath, _init_transform, _init_extra_transform, _init_placeableRes, _init_extra_placeableRes, _init_display, _init_extra_display, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_depthOffset, _init_extra_depthOffset, _init_variableStore, _init_extra_variableStore, _init_name, _init_extra_name, _init_probeOffset, _init_extra_probeOffset, _init_isUnique, _init_extra_isUnique;

/** Tr2InteriorPlaceable (interior) - generated from schema shapeHash 5fb7ec69.... */
let _Tr2InteriorPlaceable;
class Tr2InteriorPlaceable extends CjsModel {
  static {
    ({
      e: [_init_placeableResPath, _init_extra_placeableResPath, _init_transform, _init_extra_transform, _init_placeableRes, _init_extra_placeableRes, _init_display, _init_extra_display, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_depthOffset, _init_extra_depthOffset, _init_variableStore, _init_extra_variableStore, _init_name, _init_extra_name, _init_probeOffset, _init_extra_probeOffset, _init_isUnique, _init_extra_isUnique, _initProto],
      c: [_Tr2InteriorPlaceable, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorPlaceable",
      family: "interior"
    })], [[[io, io.notify, io, io.persist, type, type.string], 16, "placeableResPath"], [[io, io.notify, io, io.persist, void 0, type.objectRef("TriMatrix")], 16, "transform"], [[io, io.read, void 0, type.objectRef("WodPlaceableRes")], 16, "placeableRes"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.read, type, type.float32], 16, "boundingSphereRadius"], [[io, io.persist, type, type.float32], 16, "depthOffset"], [[io, io.read, void 0, type.objectRef("Tr2VariableStore")], 16, "variableStore"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "probeOffset"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "isUnique"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBoundingBoxInLocalSpace"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBoundingBoxInWorldSpace"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "BoundingBoxOverride"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "BoundingBoxReset"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_isUnique(this);
  }
  /** m_placeableResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  placeableResPath = (_initProto(this), _init_placeableResPath(this, ""));

  /** m_transform (PTriMatrix) [READ, PERSIST, NOTIFY] */
  transform = (_init_extra_placeableResPath(this), _init_transform(this, null));

  /** m_placeableRes (WodPlaceableResPtr) [READ] */
  placeableRes = (_init_extra_transform(this), _init_placeableRes(this, null));

  /** m_display (bool) [READWRITE] */
  display = (_init_extra_placeableRes(this), _init_display(this, true));

  /** m_boundingSphere[3] (float) [READ] */
  boundingSphereRadius = (_init_extra_display(this), _init_boundingSphereRadius(this, 0));

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  depthOffset = (_init_extra_boundingSphereRadius(this), _init_depthOffset(this, 0));

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  variableStore = (_init_extra_depthOffset(this), _init_variableStore(this, null));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_variableStore(this), _init_name(this, ""));

  /** m_probeOffset (Vector3) [READWRITE, PERSIST] */
  probeOffset = (_init_extra_name(this), _init_probeOffset(this, vec3.create()));

  /** m_isUniqueInstance (bool) [READWRITE, PERSIST, NOTIFY] */
  isUnique = (_init_extra_probeOffset(this), _init_isUnique(this, false));

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  GetBoundingBoxInLocalSpace(...args) {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetBoundingBoxInWorldSpace (MAP_METHOD_AND_WRAP). */
  GetBoundingBoxInWorldSpace(...args) {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInWorldSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxOverride (MAP_METHOD_AND_WRAP). */
  BoundingBoxOverride(...args) {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxOverride is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxReset (MAP_METHOD_AND_WRAP). */
  BoundingBoxReset(...args) {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxReset is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2InteriorPlaceable as Tr2InteriorPlaceable };
//# sourceMappingURL=Tr2InteriorPlaceable.js.map
