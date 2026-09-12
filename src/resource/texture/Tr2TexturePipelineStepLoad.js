// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.h
// Schema: format-carbon resources/Tr2TexturePipelineStepLoad.json; maintained by the runtime resource layer.
import { CjsSchema, io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineStepLoad (resources) - maintained from schema shapeHash 8f11e264.... */
export class Tr2TexturePipelineStepLoad extends CjsModel
{

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  path = "";

}

CjsSchema.define(Tr2TexturePipelineStepLoad, {
  className: "Tr2TexturePipelineStepLoad", family: "resources",
  fields: {
    path: [ io.persist, type.string ]
  }
});
