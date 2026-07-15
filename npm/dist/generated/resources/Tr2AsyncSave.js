import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_prepareSaveCbId, _init_extra_prepareSaveCbId, _init_saveFilename, _init_extra_saveFilename, _init_isSaving, _init_extra_isSaving, _init_isSavePrepared, _init_extra_isSavePrepared, _init_saveSucceeded, _init_extra_saveSucceeded, _init_saveCbId, _init_extra_saveCbId;

/** Tr2AsyncSave (resources) - generated from schema shapeHash 2d9b1936.... */
let _Tr2AsyncSave;
class Tr2AsyncSave extends CjsModel {
  static {
    ({
      e: [_init_prepareSaveCbId, _init_extra_prepareSaveCbId, _init_saveFilename, _init_extra_saveFilename, _init_isSaving, _init_extra_isSaving, _init_isSavePrepared, _init_extra_isSavePrepared, _init_saveSucceeded, _init_extra_saveSucceeded, _init_saveCbId, _init_extra_saveCbId],
      c: [_Tr2AsyncSave, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2AsyncSave",
      family: "resources"
    })], [[[type, type.unknown], 16, "prepareSaveCbId"], [[type, type.string], 16, "saveFilename"], [[type, type.unknown], 16, "isSaving"], [[type, type.unknown], 16, "isSavePrepared"], [[type, type.unknown], 16, "saveSucceeded"], [[type, type.unknown], 16, "saveCbId"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_saveCbId(this);
  }
  /** m_prepareSaveCbId (return m_isSavePrepared || m_saveCbId ||) */
  prepareSaveCbId = _init_prepareSaveCbId(this, 0);

  /** m_saveFilename (std::wstring) */
  saveFilename = (_init_extra_prepareSaveCbId(this), _init_saveFilename(this, ""));

  /** m_isSaving (CcpAtomic<uint32_t>) */
  isSaving = (_init_extra_saveFilename(this), _init_isSaving(this, null));

  /** m_isSavePrepared (CcpAtomic<uint32_t>) */
  isSavePrepared = (_init_extra_isSaving(this), _init_isSavePrepared(this, null));

  /** m_saveSucceeded (CcpAtomic<uint32_t>) */
  saveSucceeded = (_init_extra_isSavePrepared(this), _init_saveSucceeded(this, null));

  /** m_saveCbId (CcpAtomic<uint32_t>) */
  saveCbId = (_init_extra_saveSucceeded(this), _init_saveCbId(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2AsyncSave as Tr2AsyncSave };
//# sourceMappingURL=Tr2AsyncSave.js.map
