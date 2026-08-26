// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
// Schema: format-carbon resources/Tr2TexturePackChannel.json; maintained by the runtime resource layer.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePackChannel (resources) - maintained from schema shapeHash 3ea887a3.... */
@type.define({ className: "Tr2TexturePackChannel", family: "resources" })
export class Tr2TexturePackChannel extends CjsModel
{

  /** m_channel (uint8_t) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.uint8
  channel = 0;

  /** m_fill (uint8_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint8
  fill = 0;

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  path = "";

}
