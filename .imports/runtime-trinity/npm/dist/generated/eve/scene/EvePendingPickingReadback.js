import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_pickedX, _init_extra_pickedX, _init_pickedY, _init_extra_pickedY, _init_frameIndex, _init_extra_frameIndex, _init_debugLineObjects, _init_extra_debugLineObjects, _init_debugTriangleObjects, _init_extra_debugTriangleObjects, _init_debugPickBuffer, _init_extra_debugPickBuffer, _init_debugPickData, _init_extra_debugPickData, _init_mainPickBuffer, _init_extra_mainPickBuffer, _init_mainPickData, _init_extra_mainPickData;

/** EvePendingPickingReadback (eve/scene) - generated from schema shapeHash 9962b9a4.... */
let _EvePendingPickingRea;
class EvePendingPickingReadback extends CjsModel {
  static {
    ({
      e: [_init_pickedX, _init_extra_pickedX, _init_pickedY, _init_extra_pickedY, _init_frameIndex, _init_extra_frameIndex, _init_debugLineObjects, _init_extra_debugLineObjects, _init_debugTriangleObjects, _init_extra_debugTriangleObjects, _init_debugPickBuffer, _init_extra_debugPickBuffer, _init_debugPickData, _init_extra_debugPickData, _init_mainPickBuffer, _init_extra_mainPickBuffer, _init_mainPickData, _init_extra_mainPickData],
      c: [_EvePendingPickingRea, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EvePendingPickingReadback",
      family: "eve/scene"
    })], [[[type, type.uint32], 16, "pickedX"], [[type, type.uint32], 16, "pickedY"], [[type, type.uint64], 16, "frameIndex"], [type.list("Tr2DebugObjectReference"), 0, "debugLineObjects"], [type.list("Tr2DebugObjectReference"), 0, "debugTriangleObjects"], [type.rawStruct("Tr2PickBuffer"), 0, "debugPickBuffer"], [type.objectRef("void"), 0, "debugPickData"], [type.rawStruct("Tr2PickBuffer"), 0, "mainPickBuffer"], [type.objectRef("void"), 0, "mainPickData"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_mainPickData(this);
  }
  /** m_pickedX (uint32_t) */
  pickedX = _init_pickedX(this, 0);

  /** m_pickedY (uint32_t) */
  pickedY = (_init_extra_pickedX(this), _init_pickedY(this, 0));

  /** m_frameIndex (uint64_t) */
  frameIndex = (_init_extra_pickedY(this), _init_frameIndex(this, 0));

  /** m_debugLineObjects (std::vector<Tr2DebugObjectReference>) */
  debugLineObjects = (_init_extra_frameIndex(this), _init_debugLineObjects(this, []));

  /** m_debugTriangleObjects (std::vector<Tr2DebugObjectReference>) */
  debugTriangleObjects = (_init_extra_debugLineObjects(this), _init_debugTriangleObjects(this, []));

  /** m_debugPickBuffer (Tr2PickBuffer) */
  debugPickBuffer = (_init_extra_debugTriangleObjects(this), _init_debugPickBuffer(this, null));

  /** m_debugPickData (const void*) */
  debugPickData = (_init_extra_debugPickBuffer(this), _init_debugPickData(this, null));

  /** m_mainPickBuffer (Tr2PickBuffer) */
  mainPickBuffer = (_init_extra_debugPickData(this), _init_mainPickBuffer(this, null));

  /** m_mainPickData (const void*) */
  mainPickData = (_init_extra_mainPickBuffer(this), _init_mainPickData(this, null));
  static {
    _initClass();
  }
}

export { _EvePendingPickingRea as EvePendingPickingReadback };
//# sourceMappingURL=EvePendingPickingReadback.js.map
