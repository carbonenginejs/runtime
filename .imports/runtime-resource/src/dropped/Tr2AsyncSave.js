// Source: trinity/trinity/Resources/Tr2AsyncSave.h
// Dropped reference shape. Promise-based format writers replace this native callback base.
// Verify fields against format-carbon resources/Tr2AsyncSave.json.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2AsyncSave dropped reference shape (resources), schema shapeHash 2d9b1936.... */
@type.define({ className: "Tr2AsyncSave", family: "resources" })
export class Tr2AsyncSave extends CjsModel
{

  /** m_prepareSaveCbId (return m_isSavePrepared || m_saveCbId ||) */
  @type.unknown
  prepareSaveCbId = 0;

  /** m_saveFilename (std::wstring) */
  @type.string
  saveFilename = "";

  /** m_isSaving (CcpAtomic<uint32_t>) */
  @type.unknown
  isSaving = false;

  /** m_isSavePrepared (CcpAtomic<uint32_t>) */
  @type.unknown
  isSavePrepared = false;

  /** m_saveSucceeded (CcpAtomic<uint32_t>) */
  @type.unknown
  saveSucceeded = false;

  /** m_saveCbId (CcpAtomic<uint32_t>) */
  @type.unknown
  saveCbId = 0;

}
