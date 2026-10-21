import { IRoot } from "#blue/IRoot";
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
// Schema: format-carbon resources/Tr2TexturePackChannel.json; maintained by the runtime resource layer.
import { CjsSchema, type, blue } from "#schema";

/** Persisted data record mirroring Carbon's pack-step channel selection: the source channel index, fill value, and source texture path for one output channel. */
export class Tr2TexturePackChannel extends IRoot
{

  /** m_channel (uint8_t) [READWRITE, PERSIST, ENUM] */
  channel = 0;

  /** m_fill (uint8_t) [READWRITE, PERSIST] */
  fill = 0;

  /** m_path (std::wstring) [READWRITE, PERSIST] */
  path = "";

}

CjsSchema.blue.inherit(IRoot)(Tr2TexturePackChannel);

CjsSchema.decorateField(Tr2TexturePackChannel, "channel", blue.readwrite, blue.persist, type.uint8);
CjsSchema.decorateField(Tr2TexturePackChannel, "fill", blue.readwrite, blue.persist, type.uint8);
CjsSchema.decorateField(Tr2TexturePackChannel, "path", blue.readwrite, blue.persist, type.wpath);
CjsSchema.exposure.define("Tr2TexturePackChannel")(Tr2TexturePackChannel);
