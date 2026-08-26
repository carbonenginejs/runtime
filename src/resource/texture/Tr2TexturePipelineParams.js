// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h
// Schema: format-carbon resources/Tr2TexturePipelineParams.json; maintained by the runtime resource layer.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineParams (resources) - maintained from schema shapeHash 36df8e41.... */
@type.define({ className: "Tr2TexturePipelineParams", family: "resources" })
export class Tr2TexturePipelineParams extends CjsModel
{

  /** maxWidth (uint32_t) */
  @type.uint32
  maxWidth = 0;

  /** maxHeight (uint32_t) */
  @type.uint32
  maxHeight = 0;

}
