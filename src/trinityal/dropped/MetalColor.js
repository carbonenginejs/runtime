// Source: trinity/trinityal/metal/MetalUtils.h
//
// DROPPED. Four floats. Carbon declares the struct because Metal's clear colour
// and blend colour want a plain aggregate rather than its own Color type; the
// JavaScript runtime already has vec4 for exactly this, re-exported through
// @carbonenginejs/runtime/math, and every colour in the port uses it.
//
// Written down rather than ignored so the correspondence is recorded: a reader
// meeting MetalColor in Carbon should land here and be told it is vec4.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's plain RGBA aggregate for Metal clear and blend colours; dropped because vec4 already is one. */
@type.define({ className: "MetalColor", carbon: "MetalColor", family: "trinityal" })
export class MetalColor extends CjsModel
{

  /** red (float) */
  @type.float32
  red = 0;

  /** green (float) */
  @type.float32
  green = 0;

  /** blue (float) */
  @type.float32
  blue = 0;

  /** alpha (float) */
  @type.float32
  alpha = 0;

}
