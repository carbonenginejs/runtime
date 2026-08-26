// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepLoad.h
// Schema: format-carbon resources/Tr2TexturePipelineStepLoad.json; maintained by the runtime resource layer.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineStepLoad (resources) - maintained from schema shapeHash 8f11e264.... */
@type.define({ className: "Tr2TexturePipelineStepLoad", family: "resources" })
export class Tr2TexturePipelineStepLoad extends CjsModel
{

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  path = "";

}
