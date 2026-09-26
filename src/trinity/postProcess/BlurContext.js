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

  // CARBON'S PostProcessBlur NAMESPACE FUNCTIONS (Tr2PostProcessRenderer.cpp:155-216),
  // statics on the struct that namespace declares.

  /**
   * Carbon PostProcessBlur::CreateBlurContext (cpp:155-164).
   *
   * @param {number} [blurType] A `BlurType`.
   * @param {number} [channel] A `BlurChannel`.
   * @param {number} [process] A `BlurProcess`.
   * @param {number} [finalize] A `BlurFinalize`.
   * @returns {BlurContext} The context.
   */
  static createBlurContext(blurType = BlurType.BT_Big, channel = BlurChannel.BC_rgba, process = BlurProcess.BP_None, finalize = BlurFinalize.BF_None)
  {
    const context = new BlurContext();
    context.type = blurType;
    context.channel = channel;
    context.process = process;
    context.finalize = finalize;
    return context;
  }

  /** Carbon PostProcessBlur::GetBlurChannelOptionValue (cpp:168-185). */
  static getBlurChannelOptionValue(channel)
  {
    switch (channel)
    {
      case BlurChannel.BC_rgba: return "BLUR_CHANNEL_RGBA";
      case BlurChannel.BC_r: return "BLUR_CHANNEL_R";
      case BlurChannel.BC_g: return "BLUR_CHANNEL_G";
      case BlurChannel.BC_b: return "BLUR_CHANNEL_B";
      case BlurChannel.BC_a: return "BLUR_CHANNEL_A";
      default: return "BLUR_CHANNEL_RGBA";
    }
  }

  /** Carbon PostProcessBlur::GetBlurTypeOptionValue (cpp:187-194). */
  static getBlurTypeOptionValue(blurType)
  {
    return blurType === BlurType.BT_Big ? "BLUR_TYPE_BIG" : "BLUR_TYPE_SMALL";
  }

  /** Carbon PostProcessBlur::GetProcessTypeOptionValue (cpp:196-207). */
  static getProcessTypeOptionValue(process)
  {
    if (process === BlurProcess.BP_Maximum) return "BLUR_PROCESS_TYPE_MAXIMUM";
    if (process === BlurProcess.BP_Minimum) return "BLUR_PROCESS_TYPE_MINIMUM";
    return "BLUR_PROCESS_TYPE_NONE";
  }

  /** Carbon PostProcessBlur::GetFinalizeTypeOptionValue (cpp:209-216). */
  static getFinalizeTypeOptionValue(finalize)
  {
    return finalize === BlurFinalize.BF_MaxOfAllChannels ? "BLUR_FINALIZE_TYPE_MAX_OF_ALL_CHANNELS" : "BLUR_FINALIZE_TYPE_NONE";
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
