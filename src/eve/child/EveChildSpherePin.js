// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildSpherePin.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildSpherePin.cpp
import { CjsSchema, carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { EveChildMesh } from "./EveChildMesh.js";
import { EveChildSpherePinPerObjectData } from "../perObjectData/EveChildSpherePinPerObjectData.js";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

@type.define({ className: "EveChildSpherePin", family: "eve/child" })
export class EveChildSpherePin extends EveChildMesh
{

  #pinColor = vec4.fromValues(1, 1, 1, 1);

  /** Carbon maps both Blue names to the same m_pinColor storage. */
  get pinColor()
  {
    return this.#pinColor;
  }

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
      curveSet?.Update?.(time, time);
    }
  }

  /**
   * Builds Carbon's sphere-pin constant record. Matrices in GPU records are
   * stored transposed; all other values are copied in logical order.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon allocates a native Tr2PerObjectData subclass; runtime-trinity allocates or constructs the equivalent portable schema record.")
  GetPerObjectData(accumulator = null)
  {
    const data = typeof accumulator?.Allocate === "function"
      ? accumulator.Allocate(EveChildSpherePinPerObjectData)
      : new EveChildSpherePinPerObjectData();

    if (!data)
    {
      return null;
    }

    mat4.transpose(data.worldMatrix, this.worldTransform);
    vec4.set(
      data.pinPosition,
      this.centerNormal[0],
      this.centerNormal[1],
      this.centerNormal[2],
      this.pinRadius
    );
    vec4.set(data.pinRotation, this.pinRotation, 0, 0, 0);
    vec4.copy(data.pinColor, this.#pinColor);
    vec4.set(data.pinThreshold, this.pinAlphaThreshold, 0, 0, 0);
    vec4.set(
      data.pinRadiusPrecalc,
      Math.sin(this.pinRadius),
      Math.cos(this.pinRadius),
      Math.sin(this.pinRotation),
      Math.cos(this.pinRotation)
    );
    vec4.set(data.pinUV, 1, 1, 0, 0);
    return data;
  }

}

CjsSchema.decorateField(EveChildSpherePin, "pinColor", io.notify, io.persist, type.color);
CjsSchema.decorateField(EveChildSpherePin, "color", io.notify, io.persist, type.color);
