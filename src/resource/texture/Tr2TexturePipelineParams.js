// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h
// Schema: format-carbon resources/Tr2TexturePipelineParams.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Data record mirroring Carbon's texture-pipeline execution parameters, holding the maximum output width and height. */
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
