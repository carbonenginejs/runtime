// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h
// Schema: format-carbon resources/Tr2TexturePipelineParams.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineParams (resources) - maintained from schema shapeHash 36df8e41.... */
export class Tr2TexturePipelineParams extends CjsModel
{

  /** maxWidth (uint32_t) */
  maxWidth = 0;

  /** maxHeight (uint32_t) */
  maxHeight = 0;

}

CjsSchema.define(Tr2TexturePipelineParams, {
  className: "Tr2TexturePipelineParams", family: "resources",
  fields: {
    maxWidth: type.uint32,
    maxHeight: type.uint32
  }
});
