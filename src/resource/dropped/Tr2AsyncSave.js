// Source: trinity/trinity/Resources/Tr2AsyncSave.h
// Dropped reference shape. Promise-based format writers replace this native callback base.
// Verify fields against format-carbon resources/Tr2AsyncSave.json.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2AsyncSave dropped reference shape (resources), schema shapeHash 2d9b1936.... */
export class Tr2AsyncSave extends CjsModel
{

  /** m_prepareSaveCbId (return m_isSavePrepared || m_saveCbId ||) */
  prepareSaveCbId = 0;

  /** m_saveFilename (std::wstring) */
  saveFilename = "";

  /** m_isSaving (CcpAtomic<uint32_t>) */
  isSaving = false;

  /** m_isSavePrepared (CcpAtomic<uint32_t>) */
  isSavePrepared = false;

  /** m_saveSucceeded (CcpAtomic<uint32_t>) */
  saveSucceeded = false;

  /** m_saveCbId (CcpAtomic<uint32_t>) */
  saveCbId = 0;

}

CjsSchema.define(Tr2AsyncSave, {
  className: "Tr2AsyncSave", family: "resources",
  fields: {
    prepareSaveCbId: type.unknown,
    saveFilename: type.string,
    isSaving: type.unknown,
    isSavePrepared: type.unknown,
    saveSucceeded: type.unknown,
    saveCbId: type.unknown
  }
});
