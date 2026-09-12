// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLimitSize.h
// Schema: format-carbon resources/Tr2TexturePipelineStepLimitSize.json; maintained by the runtime resource layer.
import { CjsSchema, io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineStepLimitSize (resources) - maintained from schema shapeHash 9e97efed.... */
export class Tr2TexturePipelineStepLimitSize extends CjsModel
{

  /** m_maxHeight (uint32_t) [READWRITE, PERSIST] */
  maxHeight = 0;

  /** m_maxWidth (uint32_t) [READWRITE, PERSIST] */
  maxWidth = 0;

}

CjsSchema.define(Tr2TexturePipelineStepLimitSize, {
  className: "Tr2TexturePipelineStepLimitSize", family: "resources",
  fields: {
    maxHeight: [ io.persist, type.uint32 ],
    maxWidth: [ io.persist, type.uint32 ]
  }
});
