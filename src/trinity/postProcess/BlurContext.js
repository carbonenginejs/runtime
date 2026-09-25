// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/BlurContext.json.).
import { type } from "#schema";
import { CjsModel } from "#model";
import { BlurChannel, BlurFinalize, BlurProcess, BlurType } from "../generated/postProcess/enums.js";
import { blue } from "#blue";

/** Describes one post-process blur variant and produces its stable cache key from type, channel, processing, and finalization modes. */
@type.define({ className: "BlurContext", family: "postProcess" })
export class BlurContext extends CjsModel
{

  /** channel (BlurChannel - enum BlurChannel) */
  @type.int32
  @type.enum("trinity.PostProcessBlur.BlurChannel")
  channel = 4;

  /** finalize (BlurFinalize - enum BlurFinalize) */
  @type.int32
  @type.enum("trinity.PostProcessBlur.BlurFinalize")
  finalize = 0;

  /** process (BlurProcess - enum BlurProcess) */
  @type.int32
  @type.enum("trinity.PostProcessBlur.BlurProcess")
  process = 0;

  /** type (BlurType - enum BlurType) */
  @type.int32
  @type.enum("trinity.PostProcessBlur.BlurType")
  type = 0;

  /** Carbon BlurContext::Hash - the blur-variant cache key. */
  Hash()
  {
    return this.finalize * 1000 + this.process * 100 + this.type * 10 + this.channel;
  }

  static BlurChannel = BlurChannel;

  static BlurFinalize = BlurFinalize;

  static BlurProcess = BlurProcess;

  static BlurType = BlurType;

}

// PostProcessBlur's helper enums have no chooser and no Blue registration.
blue.enums.RegisterEnum("trinity.PostProcessBlur.BlurType", BlurType, {
  source: "trinity/trinity/PostProcess/Tr2PostProcessRenderer.h", family: "postProcess", line: 18
});

blue.enums.RegisterEnum("trinity.PostProcessBlur.BlurChannel", BlurChannel, {
  source: "trinity/trinity/PostProcess/Tr2PostProcessRenderer.h", family: "postProcess", line: 24
});

blue.enums.RegisterEnum("trinity.PostProcessBlur.BlurProcess", BlurProcess, {
  source: "trinity/trinity/PostProcess/Tr2PostProcessRenderer.h", family: "postProcess", line: 33
});

blue.enums.RegisterEnum("trinity.PostProcessBlur.BlurFinalize", BlurFinalize, {
  source: "trinity/trinity/PostProcess/Tr2PostProcessRenderer.h", family: "postProcess", line: 40
});
