// Source: trinity/trinity/Eve/UI/EveConnector.h
// Source: trinity/trinity/Eve/UI/EveConnector.cpp
// Source: trinity/trinity/Eve/UI/EveConnector_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; this is portable CPU graph policy.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";


const Y_AXIS = vec3.fromValues(0, 1, 0);
const V0 = vec3.create();
const V1 = vec3.create();
const V2 = vec3.create();
const SIDE = vec3.create();
const FRONT = vec3.create();
const NORMAL = vec3.create();
const ROTATED_SIDE = vec3.create();
const ROTATED_FRONT = vec3.create();
const POINT_1 = vec3.create();
const POINT_2 = vec3.create();
const MIDDLE = vec3.create();
const END_COLOR = vec4.create();


export const ConnectorType = Object.freeze({
  PointToPoint: 0,
  XZ_CircleStraight: 1,
  XZ_Circle: 2,
  StraightAnchor: 3,
  CurvedAnchor: 4,
  Orbit: 5,
  Circle: 6,
  Ellipse: 7,
});


function projectOnPlane(out, point, planePoint, normal)
{
  vec3.subtract(out, point, planePoint);
  const distance = vec3.dot(out, normal);
  out[0] = point[0] - normal[0] * distance;
  out[1] = point[1] - normal[1] * distance;
  out[2] = point[2] - normal[2] * distance;
  return out;
}


function rotateToPlane(out, point, planePoint, normal)
{
  vec3.subtract(out, point, planePoint);
  const length = vec3.length(out);
  projectOnPlane(out, point, planePoint, normal);
  vec3.subtract(out, out, planePoint);
  vec3.normalize(out, out);
  vec3.scaleAndAdd(out, planePoint, out, length);
  return out;
}


/** Builds authored tactical connector curves into an EveCurveLineSet. */
@type.define({ className: "EveConnector", family: "eve/ui" })
export class EveConnector extends CjsModel
{

  /** m_type (ConnectorType - enum ConnectorType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("ConnectorType")
  type = ConnectorType.PointToPoint;

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(0.5, 0.5, 0.5, 1);

  /** m_width (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  lineWidth = 1;

  /** m_animationColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  animationColor = vec4.fromValues(1, 0, 0, 1);

  /** m_animationScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  animationScale = 1;

  /** m_animationSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  animationSpeed = 0;

  /** m_isAnimated (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isAnimated = false;

  /** m_autoScaleAnimation (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  autoScaleAnimation = false;

  /** m_destPosition (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  destPosition = vec3.create();

  /** m_sourcePosition (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  sourcePosition = vec3.create();

  /** m_destObject (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  destObject = null;

  /** m_sourceObject (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriVectorFunction")
  sourceObject = null;

  /** m_normal (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  planeNormal = vec3.fromValues(0, 1, 0);

  /** m_length (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  length = 0;

  /** Carbon's animation normalization length. */
  #lineLength = 1;

  /** Samples any authored endpoint functions at the active update time. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript vector functions use GetValueAt(time, out); Carbon's pointer-first spelling is a native calling convention.")
  Update(context)
  {
    const time = context.GetTime();
    if (this.sourceObject)
    {
      this.sourceObject.GetValueAt(time, this.sourcePosition);
    }
    if (this.destObject)
    {
      this.destObject.GetValueAt(time, this.destPosition);
    }
  }

  /** Adds the connector's selected logical line records to an owned line set. */
  @carbon.method
  @impl.implemented
  AddLine(lineSet)
  {
    switch (this.type)
    {
      case ConnectorType.StraightAnchor:
      {
        projectOnPlane(V0, this.destPosition, this.sourcePosition, Y_AXIS);
        this.#lineLength = vec3.distance(V0, this.destPosition);
        this.#addStraightLine(lineSet, this.destPosition, V0);
        break;
      }

      case ConnectorType.CurvedAnchor:
      {
        rotateToPlane(V0, this.destPosition, this.sourcePosition, Y_AXIS);
        vec3.subtract(V1, this.destPosition, this.sourcePosition);
        vec3.subtract(V2, V0, this.sourcePosition);
        const length = vec3.length(V1);
        vec3.normalize(V1, V1);
        vec3.normalize(V2, V2);
        this.#lineLength = length * Math.acos(vec3.dot(V1, V2));
        this.#addSpheredSegment(lineSet, this.destPosition, V0, this.sourcePosition);
        break;
      }

      case ConnectorType.XZ_Circle:
      {
        const length = vec3.distance(this.destPosition, this.sourcePosition);
        this.#lineLength = Math.PI * length * 0.5;
        this.#addXZCircle(lineSet, this.sourcePosition, length);
        break;
      }

      case ConnectorType.XZ_CircleStraight:
      {
        projectOnPlane(V0, this.destPosition, this.sourcePosition, Y_AXIS);
        const length = vec3.distance(V0, this.sourcePosition);
        this.#lineLength = Math.PI * length * 0.5;
        this.#addXZCircle(lineSet, this.sourcePosition, length);
        break;
      }

      case ConnectorType.Circle:
        this.#addCircle(lineSet, this.sourcePosition, this.length, this.planeNormal);
        break;

      case ConnectorType.Ellipse:
        this.#addEllipse(lineSet, this.sourcePosition, this.destPosition[0], this.destPosition[1],
          this.destPosition[2], this.planeNormal);
        break;

      case ConnectorType.PointToPoint:
      {
        vec3.subtract(V0, this.destPosition, this.sourcePosition);
        this.#lineLength = vec3.length(V0);
        let fade = false;
        if (this.length && this.#lineLength > this.length)
        {
          vec3.normalize(V0, V0);
          vec3.scaleAndAdd(V0, this.sourcePosition, V0, this.length);
          fade = true;
        }
        else
        {
          vec3.copy(V0, this.destPosition);
        }
        this.#addStraightLine(lineSet, this.sourcePosition, V0, fade);
        break;
      }

      case ConnectorType.Orbit:
        this.#addOrbit(lineSet, this.destPosition, this.length, this.planeNormal);
        break;
    }
  }

  /** Applies authored animation settings to one emitted line segment. */
  #animateSegment(lineSet, lineId)
  {
    if (!this.isAnimated)
    {
      return;
    }

    if (this.autoScaleAnimation)
    {
      const speed = this.#lineLength === 0
        ? this.animationSpeed
        : this.animationSpeed / this.#lineLength;
      lineSet.ChangeLineAnimation(lineId, this.animationColor, speed,
        this.#lineLength * this.animationScale);
      return;
    }

    lineSet.ChangeLineAnimation(lineId, this.animationColor, this.animationSpeed, this.animationScale);
  }

  /** Emits an XZ-aligned circle as four spherical arcs. */
  #addXZCircle(lineSet, center, radius)
  {
    vec3.set(POINT_1, center[0], center[1], center[2] + radius);
    vec3.set(POINT_2, center[0] + radius, center[1], center[2]);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.set(POINT_1, center[0] + radius, center[1], center[2]);
    vec3.set(POINT_2, center[0], center[1], center[2] - radius);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.set(POINT_1, center[0], center[1], center[2] - radius);
    vec3.set(POINT_2, center[0] - radius, center[1], center[2]);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.set(POINT_1, center[0] - radius, center[1], center[2]);
    vec3.set(POINT_2, center[0], center[1], center[2] + radius);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
  }

  /** Emits a circle around an arbitrary plane normal. */
  #addCircle(lineSet, center, radius, planeNormal)
  {
    this.#calculateSideAndFront(planeNormal, SIDE, FRONT);
    vec3.scale(SIDE, SIDE, radius);
    vec3.scale(FRONT, FRONT, radius);
    this.#addFourArcCircle(lineSet, center, SIDE, FRONT);
  }

  /** Emits a circle from four supplied side/front arcs. */
  #addFourArcCircle(lineSet, center, side, front)
  {
    vec3.add(POINT_1, center, front);
    vec3.add(POINT_2, center, side);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.add(POINT_1, center, side);
    vec3.subtract(POINT_2, center, front);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.subtract(POINT_1, center, front);
    vec3.subtract(POINT_2, center, side);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.subtract(POINT_1, center, side);
    vec3.add(POINT_2, center, front);
    this.#addSpheredSegment(lineSet, POINT_1, POINT_2, center);
  }

  /** Emits an orbit and the connector from its source to that orbit. */
  #addOrbit(lineSet, center, radius, planeNormal)
  {
    vec3.normalize(NORMAL, planeNormal);
    this.#calculateSideAndFront(NORMAL, SIDE, FRONT);
    vec3.scale(SIDE, SIDE, radius);
    vec3.scale(FRONT, FRONT, radius);
    this.#addFourArcCircle(lineSet, center, SIDE, FRONT);

    vec3.subtract(V0, center, this.sourcePosition);
    const distance = vec3.dot(NORMAL, V0);
    vec3.scaleAndAdd(V0, this.sourcePosition, NORMAL, distance);
    vec3.subtract(V0, V0, center);
    vec3.normalize(V0, V0);
    vec3.scaleAndAdd(V0, center, V0, radius);
    this.#addStraightLine(lineSet, this.sourcePosition, V0);
  }

  /** Emits one straight connector segment. */
  #addStraightLine(lineSet, source, destination, fadeEnd = false)
  {
    vec4.copy(END_COLOR, this.color);
    if (fadeEnd)
    {
      vec4.set(END_COLOR, 0, 0, 0, 0);
    }
    const id = lineSet.AddStraightLine(source, this.color, destination, END_COLOR, this.lineWidth);
    this.#animateSegment(lineSet, id);
  }

  /** Emits one spherical-curve connector segment. */
  #addSpheredSegment(lineSet, point0, point1, center)
  {
    const id = lineSet.AddSpheredLineCrt(point0, this.color, point1, this.color, center, this.lineWidth);
    this.#animateSegment(lineSet, id);
  }

  /** Emits a rotated ellipse as curved line segments. */
  #addEllipse(lineSet, center, radiusX, radiusY, rotation, normal)
  {
    this.#calculateSideAndFront(normal, SIDE, FRONT);
    const radians = rotation * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    ROTATED_SIDE[0] = SIDE[0] * cosine + FRONT[0] * sine;
    ROTATED_SIDE[1] = SIDE[1] * cosine + FRONT[1] * sine;
    ROTATED_SIDE[2] = SIDE[2] * cosine + FRONT[2] * sine;
    ROTATED_FRONT[0] = -SIDE[0] * sine + FRONT[0] * cosine;
    ROTATED_FRONT[1] = -SIDE[1] * sine + FRONT[1] * cosine;
    ROTATED_FRONT[2] = -SIDE[2] * sine + FRONT[2] * cosine;

    const segmentCount = 32;
    const angleStep = 2 * Math.PI / segmentCount;
    for (let index = 0; index < segmentCount; index++)
    {
      const angle1 = index * angleStep;
      const angle2 = (index + 1) * angleStep;
      const middleAngle = (angle1 + angle2) * 0.5;
      this.#setEllipsePoint(POINT_1, center, radiusX, radiusY, angle1, 1);
      this.#setEllipsePoint(POINT_2, center, radiusX, radiusY, angle2, 1);
      this.#setEllipsePoint(MIDDLE, center, radiusX, radiusY, middleAngle, 1.01);
      this.#addCurvedLine(lineSet, POINT_1, POINT_2, MIDDLE, 5);
    }
  }

  /** Writes one point on the current rotated ellipse. */
  #setEllipsePoint(out, center, radiusX, radiusY, angle, scale)
  {
    const side = Math.cos(angle) * radiusX;
    const front = Math.sin(angle) * radiusY;
    out[0] = center[0] + (ROTATED_SIDE[0] * side + ROTATED_FRONT[0] * front) * scale;
    out[1] = center[1] + (ROTATED_SIDE[1] * side + ROTATED_FRONT[1] * front) * scale;
    out[2] = center[2] + (ROTATED_SIDE[2] * side + ROTATED_FRONT[2] * front) * scale;
    return out;
  }

  /** Emits one curved line segment and applies connector animation. */
  #addCurvedLine(lineSet, point1, point2, middle, segments)
  {
    const id = lineSet.AddCurvedLineCrt(point1, this.color, point2, this.color, middle,
      this.lineWidth, segments);
    this.#animateSegment(lineSet, id);
  }

  /** Derives orthonormal side and front axes for a plane normal. */
  #calculateSideAndFront(upDirection, outSide, outFront)
  {
    vec3.normalize(NORMAL, upDirection);
    if (Math.abs(vec3.dot(NORMAL, Y_AXIS)) < 0.999)
    {
      vec3.cross(outSide, Y_AXIS, NORMAL);
    }
    else
    {
      V0[0] = 1;
      V0[1] = 0;
      V0[2] = 0;
      vec3.cross(outSide, V0, NORMAL);
    }
    vec3.normalize(outSide, outSide);
    vec3.cross(outFront, outSide, NORMAL);
    vec3.normalize(outFront, outFront);
  }

  static ConnectorType = ConnectorType;

}
