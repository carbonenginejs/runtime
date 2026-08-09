// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2CurveLineSet.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";


function sphericalToCartesian(value, center)
{
  const phi = value[0];
  const theta = value[1];
  const radius = value[2];
  return vec3.fromValues(
    radius * Math.sin(phi) * Math.sin(theta) + center[0],
    radius * Math.cos(theta) + center[1],
    radius * Math.cos(phi) * Math.sin(theta) + center[2]
  );
}

/** A line set that draws curved and sphere-projected lines by tessellating them into straight segments. */
@type.define({ className: "Tr2CurveLineSet", family: "trinityCore" })
export class Tr2CurveLineSet extends CjsModel
{

  /** CPU-side Carbon LineData records; live vertex buffers belong to a renderer. */
  @type.list("LineData")
  lines = [];

  /** Reusable invalid line slots, matching Carbon's stable ID behavior. */
  @type.array("uint32")
  emptyLineID = [];

  /** Number of straight segments represented by the last submission. */
  @type.uint32
  currentSubmittedLineCount = 0;

  /** m_additive (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  additive = false;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_lineWidthFactor (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  lineWidthFactor = 1;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  depthOffset = 0;

  /** m_lineEffect (Tr2MaterialPtr) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.model("Tr2Material")
  lineEffect = null;

  /** m_pickEffect (Tr2MaterialPtr) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.model("Tr2Material")
  pickEffect = null;

  /** Carbon method AddCurvedLineCrt (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.adapted
  AddCurvedLineCrt(position1, color1, position2, color2, middle, width, segments = 20)
  {
    return this.#addLineData(this.#createLine(
      Tr2CurveLineSet.LineType.LINETYPE_CURVED,
      position1,
      color1,
      position2,
      color2,
      middle,
      width,
      segments > 0 ? Math.trunc(segments) : 1
    ));
  }

  /** Carbon method AddCurvedLineSph (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  AddCurvedLineSph(position1, color1, position2, color2, center, middle, width)
  {
    return this.AddCurvedLineCrt(
      sphericalToCartesian(position1, center),
      color1,
      sphericalToCartesian(position2, center),
      color2,
      sphericalToCartesian(middle, center),
      width
    );
  }

  /** Carbon method AddSpheredLineCrt (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  AddSpheredLineCrt(position1, color1, position2, color2, center, width)
  {
    return this.#addLineData(this.#createLine(
      Tr2CurveLineSet.LineType.LINETYPE_SPHERED,
      position1,
      color1,
      position2,
      color2,
      center,
      width,
      20
    ));
  }

  /** Carbon method AddSpheredLineSph (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  AddSpheredLineSph(position1, color1, position2, color2, center, width)
  {
    return this.AddSpheredLineCrt(
      sphericalToCartesian(position1, center),
      color1,
      sphericalToCartesian(position2, center),
      color2,
      center,
      width
    );
  }

  /** Carbon method AddStraightLine (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  AddStraightLine(position1, color1, position2, color2, width)
  {
    return this.#addLineData(this.#createLine(
      Tr2CurveLineSet.LineType.LINETYPE_STRAIGHT,
      position1,
      color1,
      position2,
      color2,
      vec3.create(),
      width,
      1
    ));
  }

  /** Carbon method ChangeLineIntermediateSph (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLineIntermediateSph(id, intermediatePosition, center)
  {
    this.ChangeLineIntermediateCrt(id, sphericalToCartesian(intermediatePosition, center));
  }

  /** Carbon method ChangeLineIntermediateCrt (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLineIntermediateCrt(id, intermediatePosition)
  {
    if (this.#isValidLineID(id))
    {
      vec3.copy(this.lines[id].intermediatePosition, intermediatePosition);
    }
  }

  /** Carbon method ChangeLinePositionSph (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLinePositionSph(id, position1, position2, center)
  {
    this.ChangeLinePositionCrt(id, sphericalToCartesian(position1, center), sphericalToCartesian(position2, center));
  }

  /** Carbon method ChangeLinePositionCrt (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLinePositionCrt(id, position1, position2)
  {
    if (this.#isValidLineID(id))
    {
      vec3.copy(this.lines[id].position1, position1);
      vec3.copy(this.lines[id].position2, position2);
    }
  }

  /** Carbon method ChangeLineAnimation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLineAnimation(id, color, speed, scale)
  {
    if (this.#isValidLineID(id))
    {
      vec4.copy(this.lines[id].overlayColor, color);
      this.lines[id].animationSpeed = speed;
      this.lines[id].animationScale = scale;
    }
  }

  /** Carbon method ChangeLineMultiColor (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLineMultiColor(id, color, border)
  {
    if (this.#isValidLineID(id))
    {
      vec4.copy(this.lines[id].multiColor, color);
      this.lines[id].multiColorBorder = border;
    }
  }

  /** Carbon method ChangeLineSegmentation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLineSegmentation(id, numOfSegments)
  {
    if (this.#isValidLineID(id) && this.lines[id].type !== Tr2CurveLineSet.LineType.LINETYPE_STRAIGHT)
    {
      this.lines[id].numOfSegments = Math.max(0, Math.trunc(numOfSegments));
    }
  }

  /** Carbon method ChangeLineColor (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLineColor(id, color1, color2)
  {
    if (this.#isValidLineID(id))
    {
      vec4.copy(this.lines[id].color1, color1);
      vec4.copy(this.lines[id].color2, color2);
    }
  }

  /** Carbon method ChangeLineWidth (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  ChangeLineWidth(id, width)
  {
    if (this.#isValidLineID(id))
    {
      this.lines[id].width = width;
    }
  }

  /** Carbon method ClearLines (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ClearLines()
  {
    this.lines.length = 0;
    this.emptyLineID.length = 0;
  }

  /** Carbon method RemoveLine (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  RemoveLine(id)
  {
    if (this.#isValidLineID(id))
    {
      this.lines[id].type = Tr2CurveLineSet.LineType.LINETYPE_INVALID;
      this.emptyLineID.push(id);
    }
  }

  /** Carbon method SubmitChanges (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Retains Carbon LineData and submitted segment counts; renderer runtimes realize the vertex buffer.")
  SubmitChanges()
  {
    this.currentSubmittedLineCount = this.lines.reduce((count, line) => (
      line.type === Tr2CurveLineSet.LineType.LINETYPE_INVALID ? count : count + line.numOfSegments
    ), 0);
    return true;
  }

  /**
   * Appends one tessellated segment's vertices to the line buffer.
   */
  #addLineData(line)
  {
    if (this.emptyLineID.length === 0)
    {
      this.lines.push(line);
      return this.lines.length - 1;
    }
    const id = this.emptyLineID.pop();
    this.lines[id] = line;
    return id;
  }

  /**
   * Builds a line record from its endpoints, colours and width.
   */
  #createLine(type, position1, color1, position2, color2, intermediatePosition, width, numOfSegments)
  {
    return {
      type,
      position1: vec3.clone(position1),
      color1: vec4.clone(color1),
      position2: vec3.clone(position2),
      color2: vec4.clone(color2),
      intermediatePosition: vec3.clone(intermediatePosition),
      width,
      multiColor: vec4.create(),
      multiColorBorder: -1,
      overlayColor: vec4.create(),
      animationSpeed: 0,
      animationScale: 1,
      numOfSegments
    };
  }

  /**
   * Whether a line identifier still refers to a live line.
   */
  #isValidLineID(id)
  {
    return Number.isInteger(id) && id >= 0 && id < this.lines.length && this.lines[id].type !== Tr2CurveLineSet.LineType.LINETYPE_INVALID;
  }

  static LineType = Object.freeze({
    LINETYPE_INVALID: 0,
    LINETYPE_STRAIGHT: 1,
    LINETYPE_SPHERED: 2,
    LINETYPE_CURVED: 3,
    LINETYPE_PARTICLE: 4,
  });

}
