// Source: trinity/trinity/Resources/Tr2CmfContent.h
// Dropped reference shape. CjsCmfFormat replaces this native section-lifetime helper.
// Verify fields against format-carbon resources/Tr2CmfContents.json.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Retained-only reference shape mirroring Carbon's native CMF section lifetime and decompression holder, superseded by `CjsCmfFormat`'s bounded section access and typed-array data. */
export class Tr2CmfContents extends CjsModel
{

  /** section (cmf::Section) */
  section = null;

  /** data (std::unique_ptr<uint8_t[]>) */
  data = null;

  /** m_sections (std::vector<Section>) */
  sections = [];

}

CjsSchema.define(Tr2CmfContents, {
  className: "Tr2CmfContents", family: "resources",
  fields: {
    section: type.rawStruct("cmf::Section"),
    data: type.rawStruct("uint8_t[]"),
    sections: type.list("Section")
  }
});
