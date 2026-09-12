// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepCompress.h
// Schema: format-carbon resources/Tr2TexturePipelineStepCompress.json; maintained by the runtime resource layer.
import { CjsSchema, io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineStepCompress (resources) - maintained from schema shapeHash 4d367f1c.... */
export class Tr2TexturePipelineStepCompress extends CjsModel
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  format = 71;

  /** m_bWeight (float) [READWRITE, PERSIST] */
  b = 1;

  /** m_gWeight (float) [READWRITE, PERSIST] */
  g = 1;

  /** m_rWeight (float) [READWRITE, PERSIST] */
  r = 1;

}

CjsSchema.define(Tr2TexturePipelineStepCompress, {
  className: "Tr2TexturePipelineStepCompress", family: "resources",
  fields: {
    format: [ io.persist, type.int32, type.enum("PixelFormat") ],
    b: [ io.persist, type.float32 ],
    g: [ io.persist, type.float32 ],
    r: [ io.persist, type.float32 ]
  }
});
