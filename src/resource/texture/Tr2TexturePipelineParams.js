// Source: trinity/trinity/Resources/TexturePipeline/ITr2TexturePipelineStep.h
// Schema: format-carbon resources/Tr2TexturePipelineParams.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";

/** Data record mirroring Carbon's texture-pipeline execution parameters, holding the maximum output width and height. */
export class Tr2TexturePipelineParams
{

  /** maxWidth (uint32_t) */
  maxWidth = 0;

  /** maxHeight (uint32_t) */
  maxHeight = 0;

}

CjsSchema.decorateField(Tr2TexturePipelineParams, "maxWidth", type.uint32);
CjsSchema.decorateField(Tr2TexturePipelineParams, "maxHeight", type.uint32);
CjsSchema.meta.carbon("Tr2TexturePipelineParams")(Tr2TexturePipelineParams);
