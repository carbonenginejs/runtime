// Source: trinity/trinity/PostProcess/Effects/Tr2PPDepthOfFieldEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPDepthOfFieldEffect.cpp
import { type, blue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { blue as be, EnumRegistrationType } from "#blue";


/**
 * Depth-of-field parameters - focal distance and length, circle-of-confusion and
 * blur scale, bokeh shape - plus the process-wide switch that enables the effect
 * at all.
 */
@blue.define("Tr2PPDepthOfFieldEffect")
@blue.chainTo(Tr2PPEffect)
@blue.interface(Tr2PPEffect)
export class Tr2PPDepthOfFieldEffect extends Tr2PPEffect
{

  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2Bokeh.Shape")
  bokehShape = Tr2PPDepthOfFieldEffect.Disk;

  @blue.readwrite
  @blue.persist
  @type.float32
  scale = 0;

  @blue.readwrite
  @type.float32
  cocScale = 1;

  @blue.readwrite
  @type.boolean
  useTAAFriendlyBokeh = true;

  @blue.readwrite
  @blue.persist
  @type.float32
  focalLength = 0;

  @blue.readwrite
  @blue.persist
  @type.boolean
  foregroundBlurNeeded = true;

  @blue.readwrite
  @blue.persist
  @type.float32
  focalDistance = 0;

  /**
   * Returns the shader define name for the selected bokeh shape, falling back to
   * the disk shape for an unknown value.
   */
  @blue.method
  GetBokehShapeString()
  {
    return Tr2PPDepthOfFieldEffect.BokehShapeStrings[this.bokehShape]
      ?? Tr2PPDepthOfFieldEffect.BokehShapeStrings[Tr2PPDepthOfFieldEffect.Disk];
  }

  /**
   * Reports depth of field as contributing only when the process-wide switch is
   * on, the effect is displayed, and its blur scale is positive.
   */
  @blue.method
  IsActive()
  {
    return Tr2PPDepthOfFieldEffect.PostProcessDofEnabled && this.display !== false && Number(this.scale) > 0;
  }

  static PostProcessDofEnabled = false;

  static Shape = { Disk: 0, Triangle: 1, Rectangle: 2, Pentagon: 3, Hexagon: 4, Heart: 5 };

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

be.enums.Create("trinity.Tr2Bokeh.Shape", Tr2PPDepthOfFieldEffect.Shape, {
  exposedName: "BokehShapeType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Disk", value: Tr2PPDepthOfFieldEffect.Shape.Disk, description: "A perfectly circular aperture" },
    { name: "Triangle", value: Tr2PPDepthOfFieldEffect.Shape.Triangle, description: "An aperture with 3 sides" },
    { name: "Rectangle", value: Tr2PPDepthOfFieldEffect.Shape.Rectangle, description: "An aperture with 4 sides" },
    { name: "Pentagon", value: Tr2PPDepthOfFieldEffect.Shape.Pentagon, description: "An aperture with 5 sides" },
    { name: "Hexagon", value: Tr2PPDepthOfFieldEffect.Shape.Hexagon, description: "An aperture with 6 sides" },
    { name: "Heart", value: Tr2PPDepthOfFieldEffect.Shape.Heart, description: "A heart-shaped aperture <3" }
  ]
});
