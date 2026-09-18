// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
// Schema: format-carbon resources/Tr2TexturePackChannel.json; maintained by the runtime resource layer.
import { CjsSchema, edit, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TexturePackChannel (resources) - maintained from schema shapeHash 3ea887a3.... */
export class Tr2TexturePackChannel extends CjsModel
{

  /** m_channel (uint8_t) [READWRITE, PERSIST, ENUM] */
  channel = 0;

  /** m_fill (uint8_t) [READWRITE, PERSIST] */
  fill = 0;

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  path = "";

}

CjsSchema.define(Tr2TexturePackChannel, {
  className: "Tr2TexturePackChannel", family: "resources",
  fields: {
    channel: [ edit.persist, type.uint8 ],
    fill: [ edit.persist, type.uint8 ],
    path: [ edit.persist, type.string ]
  }
});
