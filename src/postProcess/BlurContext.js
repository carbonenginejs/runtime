// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Tr2PostProcessRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/BlurContext.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** BlurContext (postProcess) - generated from schema shapeHash 5d727dce.... */
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

  static BlurChannel = Object.freeze({
    BC_r: 0,
    BC_g: 1,
    BC_b: 2,
    BC_a: 3,
    BC_rgba: 4,
  });

  static BlurFinalize = Object.freeze({
    BF_None: 0,
    BF_MaxOfAllChannels: 1,
  });

  static BlurProcess = Object.freeze({
    BP_None: 0,
    BP_Minimum: 1,
    BP_Maximum: 2,
  });

  static BlurType = Object.freeze({
    BT_Big: 0,
    BT_Small: 1,
  });

}
