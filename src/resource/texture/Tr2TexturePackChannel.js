import { exposure as be } from "#be";
import { IRoot } from "#blue/IRoot";
// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack.h
// Schema: format-carbon resources/Tr2TexturePackChannel.json; maintained by the runtime resource layer.
import { CjsSchema, type, blue } from "#schema";
import { blueEnums } from "#blue/enums/CjsBlueEnumRegistry";

/** Output-channel indices of the pack step (Tr2TexturePipelineStepPack_Blue.cpp:9). */
const ChannelChooser = Object.freeze({
  RED: 2,
  GREEN: 1,
  BLUE: 0,
  ALPHA: 3
});

// Source: trinity/trinity/Resources/TexturePipeline/Tr2TexturePipelineStepPack_Blue.cpp:9
blueEnums.Create("trinity.ChannelChooser", ChannelChooser, {
  chooser: [
    { name: "RED", value: ChannelChooser.RED, description: "" },
    { name: "GREEN", value: ChannelChooser.GREEN, description: "" },
    { name: "BLUE", value: ChannelChooser.BLUE, description: "" },
    { name: "ALPHA", value: ChannelChooser.ALPHA, description: "" }
  ]
});


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

CjsSchema.decorateField(Tr2TexturePackChannel, "channel", be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.ChannelChooser"), type.uint8);
CjsSchema.decorateField(Tr2TexturePackChannel, "fill", be.mapAttribute(be.READWRITE | be.PERSIST), type.uint8);
CjsSchema.decorateField(Tr2TexturePackChannel, "path", be.mapAttribute(be.READWRITE | be.PERSIST), type.wpath);
CjsSchema.exposure.define("Tr2TexturePackChannel")(Tr2TexturePackChannel);
