// Source: trinity/trinity/Tr2CurveLineSet.h
// Source: trinity/trinity/Tr2CurveLineSet.cpp
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type } from "#schema";

/**
 * Carbon Tr2CurveLineSet::LineData (h:106-121): one line as the set's Add methods build it before
 * `addLineData` copies it into `m_lines` (cpp:691-709, :723-742). Carbon keeps it private and unmapped and gives
 * its members no initializers; ours start at zero, so a new record is an invalid line until it is filled.
 */
@meta.define({"name":"Tr2CurveLineSet::LineData","carbon":"Tr2CurveLineSet::LineData"})
export class Tr2CurveLineSetLineData
{

  /** type (LineType): straight, sphered, curved or particle; 0 is LINETYPE_INVALID. */
  @type.int32
  type = 0;

  /** position1 (Vector3): the start position. */
  @type.vec3
  position1 = vec3.create();

  /** color1 (Color): the colour at the start. */
  @type.color
  color1 = vec4.create();

  /** position2 (Vector3): the end position. */
  @type.vec3
  position2 = vec3.create();

  /** color2 (Color): the colour at the end. */
  @type.color
  color2 = vec4.create();

  /** intermediatePosition (Vector3): the point that bends a curved line. */
  @type.vec3
  intermediatePosition = vec3.create();

  /** width (float): the width in screen pixels. */
  @type.float32
  width = 0;

  /** multiColor (Color): the override colour. */
  @type.color
  multiColor = vec4.create();

  /** multiColorBorder (float): how far along the line the override colour reaches. */
  @type.float32
  multiColorBorder = 0;

  /** overlayColor (Color): the colour of the overlay animation layer. */
  @type.color
  overlayColor = vec4.create();

  /** animationSpeed (float): how fast the animation crawls along the line. */
  @type.float32
  animationSpeed = 0;

  /** animationScale (float): the texture's scale along the line. */
  @type.float32
  animationScale = 0;

  /** numOfSegments (unsigned int): the straight segments a curved line is drawn with. */
  @type.uint32
  numOfSegments = 0;

}
