// Source: trinity/trinity/PostProcess/Effects/Tr2PPDepthOfFieldEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPDepthOfFieldEffect.cpp
import { io, type } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Depth-of-field parameters - focal distance and length, circle-of-confusion and
 * blur scale, bokeh shape - plus the process-wide switch that enables the effect
 * at all.
 */
@type.define({ className: "Tr2PPDepthOfFieldEffect", family: "postProcess" })
export class Tr2PPDepthOfFieldEffect extends Tr2PPEffect
{

  @io.persist
  @type.int32
  @type.enum("Shape")
  bokehShape = Tr2PPDepthOfFieldEffect.Disk;

  @io.persist
  @type.float32
  scale = 0;

  @io.readwrite
  @type.float32
  cocScale = 1;

  @io.readwrite
  @type.boolean
  useTAAFriendlyBokeh = true;

  @io.persist
  @type.float32
  focalLength = 0;

  @io.persist
  @type.boolean
  foregroundBlurNeeded = true;

  @io.persist
  @type.float32
  focalDistance = 0;

  /**
   * Returns the shader define name for the selected bokeh shape, falling back to
   * the disk shape for an unknown value.
   */
  GetBokehShapeString()
  {
    return Tr2PPDepthOfFieldEffect.BokehShapeStrings[this.bokehShape]
      ?? Tr2PPDepthOfFieldEffect.BokehShapeStrings[Tr2PPDepthOfFieldEffect.Disk];
  }

  /**
   * Reports depth of field as contributing only when the process-wide switch is
   * on, the effect is displayed, and its blur scale is positive.
   */
  IsActive()
  {
    return Tr2PPDepthOfFieldEffect.PostProcessDofEnabled && this.display !== false && Number(this.scale) > 0;
  }

  static PostProcessDofEnabled = false;

  static Shape = Object.freeze({ Disk: 0, Triangle: 1, Rectangle: 2, Pentagon: 3, Hexagon: 4, Heart: 5 });

  static Disk = 0;

  static Triangle = 1;

  static Rectangle = 2;

  static Pentagon = 3;

  static Hexagon = 4;

  static Heart = 5;

  static BokehShapeStrings = Object.freeze([
    "BOKEH_SHAPE_DISK",
    "BOKEH_SHAPE_TRIANGLE",
    "BOKEH_SHAPE_RECTANGLE",
    "BOKEH_SHAPE_PENTAGON",
    "BOKEH_SHAPE_HEXAGON",
    "BOKEH_SHAPE_HEART"
  ]);

}
