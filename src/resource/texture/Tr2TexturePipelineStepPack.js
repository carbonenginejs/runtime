// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
// Schema: format-carbon resources/Tr2TexturePipelineStepPack.json; maintained by runtime-resource.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePipelineStepPack (resources) - maintained from schema shapeHash 3efe48d4.... */
@type.define({ className: "Tr2TexturePipelineStepPack", family: "resources" })
export class Tr2TexturePipelineStepPack extends CjsModel
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("PixelFormat")
  format = 87;

  /** m_a (PTr2TexturePackChannel) [READ, PERSIST] */
  @io.persist
  @type.objectRef("Tr2TexturePackChannel")
  a = null;

  /** m_b (PTr2TexturePackChannel) [READ, PERSIST] */
  @io.persist
  @type.objectRef("Tr2TexturePackChannel")
  b = null;

  /** m_g (PTr2TexturePackChannel) [READ, PERSIST] */
  @io.persist
  @type.objectRef("Tr2TexturePackChannel")
  g = null;

  /** m_r (PTr2TexturePackChannel) [READ, PERSIST] */
  @io.persist
  @type.objectRef("Tr2TexturePackChannel")
  r = null;

}
