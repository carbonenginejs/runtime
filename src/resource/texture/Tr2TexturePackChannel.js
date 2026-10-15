// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
// Schema: format-carbon resources/Tr2TexturePackChannel.json; maintained by the runtime resource layer.
import { CjsSchema, type, blue } from "#schema";

/** Persisted data record mirroring Carbon's pack-step channel selection: the source channel index, fill value, and source texture path for one output channel. */
export class Tr2TexturePackChannel
{

  /** m_channel (uint8_t) [READWRITE, PERSIST, ENUM] */
  channel = 0;

  /** m_fill (uint8_t) [READWRITE, PERSIST] */
  fill = 0;

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  path = "";

}

CjsSchema.blue.define(Tr2TexturePackChannel, {
  className: "Tr2TexturePackChannel",
  fields: {
    channel: [ blue.persist, type.uint8 ],
    fill: [ blue.persist, type.uint8 ],
    path: [ blue.persist, type.wpath ]
  }
});
