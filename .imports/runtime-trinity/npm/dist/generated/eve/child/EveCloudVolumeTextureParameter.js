import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_volume, _init_extra_volume, _init_isUsedByEffect, _init_extra_isUsedByEffect, _init_name, _init_extra_name;

/** EveCloudVolumeTextureParameter (eve/child) - generated from schema shapeHash cba724f2.... */
let _EveCloudVolumeTextur;
class EveCloudVolumeTextureParameter extends CjsModel {
  static {
    ({
      e: [_init_volume, _init_extra_volume, _init_isUsedByEffect, _init_extra_isUsedByEffect, _init_name, _init_extra_name],
      c: [_EveCloudVolumeTextur, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveCloudVolumeTextureParameter",
      family: "eve/child"
    })], [[[io, io.persist, void 0, type.model("EveCloudEditableVolume")], 16, "volume"], [[io, io.read, type, type.boolean], 16, "isUsedByEffect"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_volume (EveCloudEditableVolumePtr) [READWRITE, PERSIST] */
  volume = _init_volume(this, null);

  /** m_isUsedByEffect (bool) [READ] */
  isUsedByEffect = (_init_extra_volume(this), _init_isUsedByEffect(this, false));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_isUsedByEffect(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveCloudVolumeTextur as EveCloudVolumeTextureParameter };
//# sourceMappingURL=EveCloudVolumeTextureParameter.js.map
