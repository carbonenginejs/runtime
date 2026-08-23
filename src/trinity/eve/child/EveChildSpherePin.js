// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildSpherePin.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildSpherePin.cpp
import { CjsSchema, carbon, impl, io, type } from "#schema";
import { EveChildMesh } from "./EveChildMesh.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/**
 * Child mesh that draws a pin on a sphere's surface, contributing the pin's
 * centre normal, radius, rotation, alpha threshold and colour to its own
 * per-object shader data.
 */
@type.define({ className: "EveChildSpherePin", family: "eve/child" })
export class EveChildSpherePin extends EveChildMesh
{

  #pinColor = vec4.fromValues(1, 1, 1, 1);

  /** Carbon maps both Blue names to the same m_pinColor storage. */
  get pinColor()
  {
    return this.#pinColor;
  }

  /**
   * Copies a four-component colour into the owned buffer; a shorter value is
   * ignored rather than partially applied.
   */
  set pinColor(value)
  {
    if (value?.length >= 4)
    {
      vec4.copy(this.#pinColor, value);
    }
  }

  /** Blue alias for pinColor. */
  get color()
  {
    return this.#pinColor;
  }

  /** Blue alias that writes through to pinColor. */
  set color(value)
  {
    this.pinColor = value;
  }

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_centerNormal (Vector3) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.vec3
  centerNormal = vec3.create();

  /** m_pinMaxRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinMaxRadius = 0.2;

  /** m_pinRadius (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinRadius = 0;

  /** m_pinRotation (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinRotation = 0;

  /** m_pinAlphaThreshold (float) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.float32
  pinAlphaThreshold = 0;

  /** Carbon updates the mesh first, then advances every attached curve set. */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext, params)
  {
    super.UpdateAsyncronous(updateContext, params);
    const time = updateContext?.GetTime?.() ?? updateContext?.currentTime ?? 0;
    for (const curveSet of this.curveSets)
    {
      curveSet.Update(time, time, updateContext.renderContext);
    }
  }

  /**
   * Carbon EveChildSpherePin::GetPerObjectData (cpp:40-62). One transient
   * payload; Set(MATRIX) performs Carbon's `Transpose(m_worldTransform)`.
   * The struct registers with stages ["vs", "ps"]: the SAME bytes are bound
   * to both per-object slots (cpp:68-75).
   */
  @carbon.method
  @impl.implemented
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
    data.Set("pinColor", this.#pinColor);
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

CjsSchema.decorateField(EveChildSpherePin, "pinColor", io.notify, io.persist, type.color);
CjsSchema.decorateField(EveChildSpherePin, "color", io.notify, io.persist, type.color);
