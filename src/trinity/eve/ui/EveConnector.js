// Source: trinity/trinity/Eve/UI/EveConnector.h
// Source: trinity/trinity/Eve/UI/EveConnector.cpp
// Source: trinity/trinity/Eve/UI/EveConnector_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; this is portable CPU graph policy.
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { blue, EnumRegistrationType } from "#blue";


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


export const ConnectorType = {
  PointToPoint: 0,
  XZ_CircleStraight: 1,
  XZ_Circle: 2,
  StraightAnchor: 3,
  CurvedAnchor: 4,
  Orbit: 5,
  Circle: 6,
  Ellipse: 7,
};


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
@meta.define({ className: "EveConnector", family: "eve/ui" })
export class EveConnector
{

  /** m_type (ConnectorType - enum ConnectorType) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveConnector.ConnectorType")
  type = ConnectorType.PointToPoint;

  /** m_color (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.fromValues(0.5, 0.5, 0.5, 1);

  /** m_width (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  lineWidth = 1;

  /** m_animationColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  animationColor = vec4.fromValues(1, 0, 0, 1);

  /** m_animationScale (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  animationScale = 1;

  /** m_animationSpeed (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  animationSpeed = 0;

  /** m_isAnimated (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isAnimated = false;

  /** m_autoScaleAnimation (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  autoScaleAnimation = false;

  /** m_destPosition (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  destPosition = vec3.create();

  /** m_sourcePosition (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  sourcePosition = vec3.create();

  /** m_destObject (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  destObject = null;

  /** m_sourceObject (ITriVectorFunctionPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("ITriVectorFunction")
  sourceObject = null;

  /** m_normal (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  planeNormal = vec3.fromValues(0, 1, 0);

  /** m_length (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  length = 0;

  /** Carbon's animation normalization length. */
  _lineLength = 1;

  /**
   * Samples any authored endpoint functions at the active update time.
   *
   * Adapted: JavaScript vector functions use GetValueAt(time, out); Carbon's pointer-first
   * spelling is a native calling convention.
   */
  @meta.blue.method
  @meta.adapted
  Update(context)
  {
    const time = context.GetTime();
    if (this.sourceObject)
    {
      this.sourceObject.GetValueAt__Ticks(time, this.sourcePosition);
    }
    if (this.destObject)
    {
      this.destObject.GetValueAt__Ticks(time, this.destPosition);
    }
  }

  /** Adds the connector's selected logical line records to an owned line set. */
  @meta.blue.method
  @meta.implemented
  AddLine(lineSet)
  {
    switch (this.type)
    {
      case ConnectorType.StraightAnchor:
      {
        projectOnPlane(V0, this.destPosition, this.sourcePosition, Y_AXIS);
        this._lineLength = vec3.distance(V0, this.destPosition);
        this._AddStraightLine(lineSet, this.destPosition, V0);
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
        this._lineLength = length * Math.acos(vec3.dot(V1, V2));
        this._AddSpheredSegment(lineSet, this.destPosition, V0, this.sourcePosition);
        break;
      }

      case ConnectorType.XZ_Circle:
      {
        const length = vec3.distance(this.destPosition, this.sourcePosition);
        this._lineLength = Math.PI * length * 0.5;
        this._AddCircle(lineSet, this.sourcePosition, length);
        break;
      }

      case ConnectorType.XZ_CircleStraight:
      {
        projectOnPlane(V0, this.destPosition, this.sourcePosition, Y_AXIS);
        const length = vec3.distance(V0, this.sourcePosition);
        this._lineLength = Math.PI * length * 0.5;
        this._AddCircle(lineSet, this.sourcePosition, length);
        break;
      }

      case ConnectorType.Circle:
        this._AddCircle__PlaneNormal(lineSet, this.sourcePosition, this.length, this.planeNormal);
        break;

      case ConnectorType.Ellipse:
        this._AddEllipse(lineSet, this.sourcePosition, this.destPosition[0], this.destPosition[1],
          this.destPosition[2], this.planeNormal);
        break;

      case ConnectorType.PointToPoint:
      {
        vec3.subtract(V0, this.destPosition, this.sourcePosition);
        this._lineLength = vec3.length(V0);
        let fade = false;
        if (this.length && this._lineLength > this.length)
        {
          vec3.normalize(V0, V0);
          vec3.scaleAndAdd(V0, this.sourcePosition, V0, this.length);
          fade = true;
        }
        else
        {
          vec3.copy(V0, this.destPosition);
        }
        this._AddStraightLine(lineSet, this.sourcePosition, V0, fade);
        break;
      }

      case ConnectorType.Orbit:
        this._AddOrbit(lineSet, this.destPosition, this.length, this.planeNormal);
        break;
    }
  }

  /** Applies authored animation settings to one emitted line segment (EveConnector.cpp:111-129). */
  _AnimateSegment(lineSet, lineId)
  {
    if (!this.isAnimated)
    {
      return;
    }

    if (this.autoScaleAnimation)
    {
      const speed = this._lineLength === 0
        ? this.animationSpeed
        : this.animationSpeed / this._lineLength;
      lineSet.ChangeLineAnimation(lineId, this.animationColor, speed,
        this._lineLength * this.animationScale);
      return;
    }

    lineSet.ChangeLineAnimation(lineId, this.animationColor, this.animationSpeed, this.animationScale);
  }

  /** Emits an XZ-aligned circle as four spherical arcs (EveConnector.cpp:131-137, the overload without a normal). */
  _AddCircle(lineSet, center, radius)
  {
    vec3.set(POINT_1, center[0], center[1], center[2] + radius);
    vec3.set(POINT_2, center[0] + radius, center[1], center[2]);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.set(POINT_1, center[0] + radius, center[1], center[2]);
    vec3.set(POINT_2, center[0], center[1], center[2] - radius);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.set(POINT_1, center[0], center[1], center[2] - radius);
    vec3.set(POINT_2, center[0] - radius, center[1], center[2]);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.set(POINT_1, center[0] - radius, center[1], center[2]);
    vec3.set(POINT_2, center[0], center[1], center[2] + radius);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
  }

  /** Emits a circle around an arbitrary plane normal as four spherical arcs (EveConnector.cpp:139-150). */
  _AddCircle__PlaneNormal(lineSet, center, radius, planeNormal)
  {
    this._CalculateSideAndFront(planeNormal, SIDE, FRONT);
    vec3.scale(SIDE, SIDE, radius);
    vec3.scale(FRONT, FRONT, radius);

    vec3.add(POINT_1, center, FRONT);
    vec3.add(POINT_2, center, SIDE);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.add(POINT_1, center, SIDE);
    vec3.subtract(POINT_2, center, FRONT);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.subtract(POINT_1, center, FRONT);
    vec3.subtract(POINT_2, center, SIDE);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.subtract(POINT_1, center, SIDE);
    vec3.add(POINT_2, center, FRONT);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
  }

  /** Emits an orbit and the connector from its source to that orbit (EveConnector.cpp:152-173). */
  _AddOrbit(lineSet, center, radius, planeNormal)
  {
    vec3.normalize(NORMAL, planeNormal);
    this._CalculateSideAndFront(NORMAL, SIDE, FRONT);
    vec3.scale(SIDE, SIDE, radius);
    vec3.scale(FRONT, FRONT, radius);

    vec3.add(POINT_1, center, FRONT);
    vec3.add(POINT_2, center, SIDE);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.add(POINT_1, center, SIDE);
    vec3.subtract(POINT_2, center, FRONT);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.subtract(POINT_1, center, FRONT);
    vec3.subtract(POINT_2, center, SIDE);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);
    vec3.subtract(POINT_1, center, SIDE);
    vec3.add(POINT_2, center, FRONT);
    this._AddSpheredSegment(lineSet, POINT_1, POINT_2, center);

    vec3.subtract(V0, center, this.sourcePosition);
    const distance = vec3.dot(NORMAL, V0);
    vec3.scaleAndAdd(V0, this.sourcePosition, NORMAL, distance);
    vec3.subtract(V0, V0, center);
    vec3.normalize(V0, V0);
    vec3.scaleAndAdd(V0, center, V0, radius);
    this._AddStraightLine(lineSet, this.sourcePosition, V0);
  }

  /** Emits one straight connector segment (EveConnector.cpp:175-184). */
  _AddStraightLine(lineSet, source, destination, fadeEnd = false)
  {
    vec4.copy(END_COLOR, this.color);
    if (fadeEnd)
    {
      vec4.set(END_COLOR, 0, 0, 0, 0);
    }
    const id = lineSet.AddStraightLine(source, this.color, destination, END_COLOR, this.lineWidth);
    this._AnimateSegment(lineSet, id);
  }

  /** Emits one spherical-curve connector segment (EveConnector.cpp:186-190). */
  _AddSpheredSegment(lineSet, point0, point1, center)
  {
    const id = lineSet.AddSpheredLineCrt(point0, this.color, point1, this.color, center, this.lineWidth);
    this._AnimateSegment(lineSet, id);
  }

  /** Emits a rotated ellipse as 32 curved line segments of 5 subdivisions each (EveConnector.cpp:192-223). */
  _AddEllipse(lineSet, center, radiusX, radiusY, rotation, normal)
  {
    this._CalculateSideAndFront(normal, SIDE, FRONT);
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
      const side1 = Math.cos(angle1) * radiusX, front1 = Math.sin(angle1) * radiusY;
      const side2 = Math.cos(angle2) * radiusX, front2 = Math.sin(angle2) * radiusY;
      const sideMiddle = Math.cos(middleAngle) * radiusX, frontMiddle = Math.sin(middleAngle) * radiusY;
      for (let axis = 0; axis < 3; axis++)
      {
        POINT_1[axis] = center[axis] + ROTATED_SIDE[axis] * side1 + ROTATED_FRONT[axis] * front1;
        POINT_2[axis] = center[axis] + ROTATED_SIDE[axis] * side2 + ROTATED_FRONT[axis] * front2;
        // Carbon's 1.01 keeps the line from looking jagged.
        MIDDLE[axis] = center[axis] + (ROTATED_SIDE[axis] * sideMiddle + ROTATED_FRONT[axis] * frontMiddle) * 1.01;
      }
      this._AddCurvedLine(lineSet, POINT_1, POINT_2, MIDDLE, 5);
    }
  }

  /** Emits one curved line segment and applies connector animation (EveConnector.cpp:225-231). */
  _AddCurvedLine(lineSet, point1, point2, middle, segments)
  {
    const id = lineSet.AddCurvedLineCrt(point1, this.color, point2, this.color, middle,
      this.lineWidth, segments);
    this._AnimateSegment(lineSet, id);
  }

  /** Derives orthonormal side and front axes for a plane normal (EveConnector.cpp:233-248). */
  _CalculateSideAndFront(upDirection, outSide, outFront)
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

// Registered as Carbon registers it (trinity/trinity/Eve/UI/EveConnector_Blue.cpp:34).
blue.enums.Create("trinity.EveConnector.ConnectorType", EveConnector.ConnectorType, {
  source: "trinity/trinity/Eve/UI/EveConnector.h", family: "eve/ui", line: 24,
  exposedName: "EveConnectorStyle", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/UI/EveConnector_Blue.cpp:6",
  chooser: [
    { name: "PointToPoint", value: EveConnector.ConnectorType.PointToPoint, description: "Connection between two points" },
    { name: "StraightAnchor", value: EveConnector.ConnectorType.StraightAnchor, description: "Anchor line from dest to xz plane containing source" },
    { name: "CurvedAnchor", value: EveConnector.ConnectorType.CurvedAnchor, description: "Sphered line from dest to xz plane containing source using source as the center" },
    { name: "XZ_Circle", value: EveConnector.ConnectorType.XZ_Circle, description: "Circle in xz plane going through the 'CurvedAnchor' point with source as the center" },
    { name: "XZ_CircleStraight", value: EveConnector.ConnectorType.XZ_CircleStraight, description: "Circle in xz plane going through the 'StraightAnchor' point with source as the center" },
    { name: "Circle", value: EveConnector.ConnectorType.Circle, description: "Circle in the plane normal plane" },
    { name: "Ellipse", value: EveConnector.ConnectorType.Ellipse, description: "Ellipse in the plane normal plane, radiusX is destPosition.x, radiusY is destPosition.y and ellipse rotation is destPosition.z" },
    { name: "Orbit", value: EveConnector.ConnectorType.Orbit, description: "Draws an orbit using planeNormal and radius" }
  ]
});
