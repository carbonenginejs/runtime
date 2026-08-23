import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_sortingModifier, _init_extra_sortingModifier, _init_currentLod, _init_extra_currentLod, _init_minScreenSize, _init_extra_minScreenSize, _init_preTesselationLevel, _init_extra_preTesselationLevel, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_scaling, _init_extra_scaling, _init_effect, _init_extra_effect, _init_volume, _init_extra_volume, _init_cellScreenSize, _init_extra_cellScreenSize, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_boundingSphere, _init_extra_boundingSphere;

/** EveChildCloud (eve/child) - generated from schema shapeHash fc227af6.... */
let _EveChildCloud;
class EveChildCloud extends CjsModel {
  static {
    ({
      e: [_init_sortingModifier, _init_extra_sortingModifier, _init_currentLod, _init_extra_currentLod, _init_minScreenSize, _init_extra_minScreenSize, _init_preTesselationLevel, _init_extra_preTesselationLevel, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_scaling, _init_extra_scaling, _init_effect, _init_extra_effect, _init_volume, _init_extra_volume, _init_cellScreenSize, _init_extra_cellScreenSize, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_boundingSphere, _init_extra_boundingSphere],
      c: [_EveChildCloud, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildCloud",
      family: "eve/child"
    })], [[[io, io.persist, type, type.float32], 16, "sortingModifier"], [[io, io.read, type, type.uint64], 16, "currentLod"], [[io, io.persist, type, type.float32], 16, "minScreenSize"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "preTesselationLevel"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, void 0, type.model("Tr2Material")], 16, "effect"], [[io, io.persist, void 0, type.model("EveCloudEditableVolume")], 16, "volume"], [[io, io.persist, type, type.float32], 16, "cellScreenSize"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[io, io.read, type, type.vec4], 16, "boundingSphere"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_boundingSphere(this);
  }
  /** m_sortingModifier (float) [READWRITE, PERSIST] */
  sortingModifier = _init_sortingModifier(this, 1);

  /** m_currentIB (size_t) [READ] */
  currentLod = (_init_extra_sortingModifier(this), _init_currentLod(this, 0));

  /** m_minScreenSize (float) [READWRITE, PERSIST] */
  minScreenSize = (_init_extra_currentLod(this), _init_minScreenSize(this, 0));

  /** m_preTesselationLevel (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  preTesselationLevel = (_init_extra_minScreenSize(this), _init_preTesselationLevel(this, 32));

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = (_init_extra_preTesselationLevel(this), _init_rotation(this, quat.create()));

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  scaling = (_init_extra_translation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

  /** m_effect (Tr2MaterialPtr) [READWRITE, PERSIST] */
  effect = (_init_extra_scaling(this), _init_effect(this, null));

  /** m_volume (EveCloudEditableVolumePtr) [READWRITE, PERSIST] */
  volume = (_init_extra_effect(this), _init_volume(this, null));

  /** m_cellScreenSize (float) [READWRITE, PERSIST] */
  cellScreenSize = (_init_extra_volume(this), _init_cellScreenSize(this, 0.3));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_cellScreenSize(this), _init_name(this, ""));

  /** m_display (bool) [READWRITE] */
  display = (_init_extra_name(this), _init_display(this, true));

  /** m_boundingSphere (Vector4) [READ] */
  boundingSphere = (_init_extra_display(this), _init_boundingSphere(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _EveChildCloud as EveChildCloud };
//# sourceMappingURL=EveChildCloud.js.map
