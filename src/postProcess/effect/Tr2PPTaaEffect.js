// Source: E:\carbonengine\trinity\trinity\PostProcess\Effects\Tr2PPTaaEffect.h
// Source: E:\carbonengine\trinity\trinity\PostProcess\Effects\Tr2PPTaaEffect.cpp
import { io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Temporal anti-aliasing settings: quality level, the early-out threshold below
 * which pixels are left alone, and the debug visualization selector.
 */
@type.define({ className: "Tr2PPTaaEffect", family: "postProcess" })
export class Tr2PPTaaEffect extends Tr2PPEffect
{

  @io.readwrite
  @type.int32
  @schema.enum("Debug")
  debug = Tr2PPTaaEffect.TAA_DEBUG_OFF;

  @io.readwrite
  @type.int32
  @schema.enum("Quality")
  quality = Tr2PPTaaEffect.TAA_HIGH;

  @io.readwrite
  @type.float32
  earlyOutThreshold = 0.001;

  /**
   * Reports TAA as contributing whenever it is displayed; unlike the other
   * effects it has no intensity or scale to gate on.
   */
  IsActive()
  {
    return this.display !== false;
  }

  static Quality = Object.freeze({ TAA_LOW: 1, TAA_MEDIUM: 2, TAA_HIGH: 3 });

  static Debug = Object.freeze({ TAA_DEBUG_OFF: 0, TAA_DEBUG_MOTION_VECTORS: 1, TAA_DEBUG_EARLY_OUT_MASK: 2 });

  static TAA_LOW = 1;

  static TAA_MEDIUM = 2;

  static TAA_HIGH = 3;

  static TAA_DEBUG_OFF = 0;

  static TAA_DEBUG_MOTION_VECTORS = 1;

  static TAA_DEBUG_EARLY_OUT_MASK = 2;

}
