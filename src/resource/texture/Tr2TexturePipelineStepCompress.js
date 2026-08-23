// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.h
// Schema: format-carbon resources/Tr2TexturePipelineStepCompress.json; maintained by runtime-resource.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineStepCompress (resources) - maintained from schema shapeHash 4d367f1c.... */
@type.define({ className: "Tr2TexturePipelineStepCompress", family: "resources" })
export class Tr2TexturePipelineStepCompress extends CjsModel
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("PixelFormat")
  format = 71;

  /** m_bWeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  b = 1;

  /** m_gWeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  g = 1;

  /** m_rWeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  r = 1;

}
