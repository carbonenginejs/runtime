// Source: trinity/trinity/Resources/Tr2AsyncSave.h
// Dropped reference shape. Promise-based format writers replace this native callback base.
// Verify fields against format-carbon resources/Tr2AsyncSave.json.
import { CjsSchema, meta } from "#schema";

/** Retained-only reference shape mirroring Carbon's abstract prepare/save callback base, superseded by promise-based format `Write`/`WriteAsync` operations and resource-level save-status compatibility methods. */
export class Tr2AsyncSave
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
    prepareSaveCbId: meta.type.unknown,
    saveFilename: meta.type.string,
    isSaving: meta.type.unknown,
    isSavePrepared: meta.type.unknown,
    saveSucceeded: meta.type.unknown,
    saveCbId: meta.type.unknown
  }
});
