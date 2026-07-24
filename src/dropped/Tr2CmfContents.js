// Source: trinity/trinity/Resources/Tr2CmfContent.h
// Dropped reference shape. CjsCmfFormat replaces this native section-lifetime helper.
// Verify fields against format-carbon resources/Tr2CmfContents.json.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2CmfContents dropped reference shape (resources), schema shapeHash e7125c76.... */
@type.define({ className: "Tr2CmfContents", family: "resources" })
export class Tr2CmfContents extends CjsModel
{

  /** section (cmf::Section) */
  @type.rawStruct("cmf::Section")
  section = null;

  /** data (std::unique_ptr<uint8_t[]>) */
  @type.rawStruct("uint8_t[]")
  data = null;

  /** m_sections (std::vector<Section>) */
  @type.list("Section")
  sections = [];

}
