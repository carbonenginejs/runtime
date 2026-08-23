// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/BlurContext.json.).
import { type } from "#schema";
import { CjsModel } from "#model";
import { BlurChannel, BlurFinalize, BlurProcess, BlurType } from "../generated/postProcess/enums.js";

/** Describes one post-process blur variant and produces its stable cache key from type, channel, processing, and finalization modes. */
@type.define({ className: "BlurContext", family: "postProcess" })
export class BlurContext extends CjsModel
{

  /** channel (BlurChannel - enum BlurChannel) */
  @type.int32
  @type.enum("BlurChannel")
  channel = 4;

  /** finalize (BlurFinalize - enum BlurFinalize) */
  @type.int32
  @type.enum("BlurFinalize")
  finalize = 0;

  /** process (BlurProcess - enum BlurProcess) */
  @type.int32
  @type.enum("BlurProcess")
  process = 0;

  /** type (BlurType - enum BlurType) */
  @type.int32
  @type.enum("BlurType")
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
