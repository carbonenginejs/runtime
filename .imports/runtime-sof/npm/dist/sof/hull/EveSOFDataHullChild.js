import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_buildFilter, _init_extra_buildFilter, _init_redFilePath, _init_extra_redFilePath, _init_lowestLodVisible, _init_extra_lowestLodVisible, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_id, _init_extra_id, _init_groupIndex, _init_extra_groupIndex;

/** EveSOFDataHullChild (eve) - generated from schema shapeHash 28ff7a88.... */
let _EveSOFDataHullChild;
class EveSOFDataHullChild extends CjsModel {
  static {
    ({
      e: [_init_buildFilter, _init_extra_buildFilter, _init_redFilePath, _init_extra_redFilePath, _init_lowestLodVisible, _init_extra_lowestLodVisible, _init_translation, _init_extra_translation, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_id, _init_extra_id, _init_groupIndex, _init_extra_groupIndex],
      c: [_EveSOFDataHullChild, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullChild",
      family: "eve"
    })], [[[io, io.persist, type, type.uint32], 16, "buildFilter"], [[io, io.persist, type, type.string], 16, "redFilePath"], [[io, io.persist, type, type.int32, void 0, type.enum("Tr2Lod")], 16, "lowestLodVisible"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.int32], 16, "id"], [[io, io.persist, type, type.int32], 16, "groupIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_groupIndex(this);
  }
  /** m_buildFilter (uint32_t) [READWRITE, PERSIST] */
  buildFilter = _init_buildFilter(this, 0xffffffff);

  /** m_redFilePath (std::string) [READWRITE, PERSIST] */
  redFilePath = (_init_extra_buildFilter(this), _init_redFilePath(this, ""));

  /** m_lowestLodVisible (Tr2Lod - enum Tr2Lod) [READWRITE, PERSIST] */
  lowestLodVisible = (_init_extra_redFilePath(this), _init_lowestLodVisible(this, 0));

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  translation = (_init_extra_lowestLodVisible(this), _init_translation(this, vec3.create()));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_translation(this), _init_rotation(this, quat.create()));

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_id (int32_t) [READWRITE, PERSIST] */
  id = (_init_extra_scaling(this), _init_id(this, -1));

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  groupIndex = (_init_extra_id(this), _init_groupIndex(this, -1));
  GetName() {
    const slash = this.redFilePath.lastIndexOf("/");
    if (slash === -1) {
      return "";
    }
    let result = this.redFilePath.substring(slash + 1);
    const dot = result.lastIndexOf(".");
    if (dot !== -1) {
      result = result.substring(0, dot);
    }
    return result;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataHullChild as EveSOFDataHullChild };
//# sourceMappingURL=EveSOFDataHullChild.js.map
