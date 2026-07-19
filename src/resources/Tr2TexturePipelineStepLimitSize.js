// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.h
// Schema: format-carbon resources/Tr2TexturePipelineStepLimitSize.json; maintained by runtime-resource.
import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsModel } from "@carbonenginejs/core-types/model";

/** Tr2TexturePipelineStepLimitSize (resources) - maintained from schema shapeHash 9e97efed.... */
@type.define({ className: "Tr2TexturePipelineStepLimitSize", family: "resources" })
export class Tr2TexturePipelineStepLimitSize extends CjsModel
{

  /** m_maxHeight (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  maxHeight = 0;

  /** m_maxWidth (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  maxWidth = 0;

}
