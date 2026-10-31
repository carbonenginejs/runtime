import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildSpherePin.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildSpherePin.cpp
import { meta, type } from "#schema";
import { EveChildMesh } from "./EveChildMesh.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/**
 * Child mesh that draws a pin on a sphere's surface, contributing the pin's
 * centre normal, radius, rotation, alpha threshold and colour to its own
 * per-object shader data.
 */
@be.define("EveChildSpherePin")
@be.exposureChainTo(EveChildMesh)
export class EveChildSpherePin extends EveChildMesh
{

  /** m_pinColor (Color) [READWRITE, NOTIFY, PERSIST]; "color" is its second name (EveChildSpherePin_Blue.cpp:17-18). */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST, "color")
  @type.color
  pinColor = vec4.fromValues(1, 1, 1, 1);

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("TriCurveSet")
  curveSets = [];

  /** m_centerNormal (Vector3) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.vec3
  centerNormal = vec3.create();

  /** m_pinMaxRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  pinMaxRadius = 0.2;

  /** m_pinRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  pinRadius = 0;

  /** m_pinRotation (float) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  pinRotation = 0;

  /** m_pinAlphaThreshold (float) [READWRITE, NOTIFY, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.float32
  pinAlphaThreshold = 0;

  /**
   * Carbon EveChildSpherePin.cpp:30-38 updates the mesh first, then reads the
   * required context clock and advances every attached curve set.
   *
   * @implemented
   */

  @meta.implemented
  UpdateAsyncronous(updateContext, params)
  {
    super.UpdateAsyncronous(updateContext, params);
    const time = updateContext.GetTime();
    for (const curveSet of this.curveSets)
    {
      curveSet.Update__RealTimeSimTime(time, time);
    }
  }

  /**
   * Carbon EveChildSpherePin::GetPerObjectData (cpp:40-62). One transient
   * payload; Set(MATRIX) performs Carbon's `Transpose(m_worldTransform)`.
   * The struct registers with stages ["vs", "ps"]: the SAME bytes are bound
   * to both per-object slots (cpp:68-75).
   *
   * @implemented
   */

  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveChildSpherePinPerObjectData");

    data.SetAndTranspose("worldMatrix", this.worldTransform);
    data.Set("pinPosition", [
      this.centerNormal[0],
      this.centerNormal[1],
      this.centerNormal[2],
      this.pinRadius
    ]);
    data.Set("pinRotation", [this.pinRotation, 0, 0, 0]);
    data.Set("pinColor", this.pinColor);
    data.Set("pinThreshold", [this.pinAlphaThreshold, 0, 0, 0]);
    data.Set("pinRadiusPrecalc", [
      Math.sin(this.pinRadius),
      Math.cos(this.pinRadius),
      Math.sin(this.pinRotation),
      Math.cos(this.pinRotation)
    ]);
    data.Set("pinUV", [1, 1, 0, 0]);

    return data;
  }

}


// EveChildSpherePin_Blue.cpp: native exposure.
