// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/EveSpaceObjectFxAttributes.h
//   trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/EveSpaceObjectFxAttributes.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { EveSpaceObject2 } from "../EveSpaceObject2.js";
import { EveShip2 } from "../EveShip2.js";

const BOUNDING_SPHERE = vec4.create();
const OBJECT_POSITION = vec3.create();
const PARENT_TRANSFORM = mat4.create();

/**
 * Carbon math/src/Quaternion.cpp RotationQuaternion(Matrix): direct
 * trace/max-diagonal conversion. Deliberately does not strip scale or
 * normalize the result.
 */
function RotationQuaternion(out, matrix)
{
  const trace = matrix[0] + matrix[5] + matrix[10] + 1;
  if (trace > 1)
  {
    const root = Math.sqrt(trace);
    const divisor = 2 * root;
    out[0] = (matrix[6] - matrix[9]) / divisor;
    out[1] = (matrix[8] - matrix[2]) / divisor;
    out[2] = (matrix[1] - matrix[4]) / divisor;
    out[3] = root / 2;
    return out;
  }

  let largest = 0;
  if (matrix[5] > matrix[0]) largest = 1;
  if (matrix[10] > matrix[largest * 5]) largest = 2;

  let scale;
  if (largest === 0)
  {
    scale = 2 * Math.sqrt(1 + matrix[0] - matrix[5] - matrix[10]);
    out[0] = 0.25 * scale;
    out[1] = (matrix[1] + matrix[4]) / scale;
    out[2] = (matrix[2] + matrix[8]) / scale;
    out[3] = (matrix[6] - matrix[9]) / scale;
  }
  else if (largest === 1)
  {
    scale = 2 * Math.sqrt(1 + matrix[5] - matrix[0] - matrix[10]);
    out[0] = (matrix[1] + matrix[4]) / scale;
    out[1] = 0.25 * scale;
    out[2] = (matrix[6] + matrix[9]) / scale;
    out[3] = (matrix[8] - matrix[2]) / scale;
  }
  else
  {
    scale = 2 * Math.sqrt(1 + matrix[10] - matrix[0] - matrix[5]);
    out[0] = (matrix[2] + matrix[8]) / scale;
    out[1] = (matrix[6] + matrix[9]) / scale;
    out[2] = 0.25 * scale;
    out[3] = (matrix[1] - matrix[4]) / scale;
  }
  return out;
}

@type.define({ className: "EveSpaceObjectFxAttributes", family: "eve/fxAttributes" })
export class EveSpaceObjectFxAttributes extends CjsModel
{

  #initialized = false;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_activationStrength (float) [READ] */
  @io.read
  @type.float32
  activationStrength = 1;

  /** m_activeTurretCount (float) [READ] */
  @io.read
  @type.float32
  activeTurretCount = 0;

  /** m_distanceToChildParent (float) [READ] */
  @io.read
  @type.float32
  childParent = 0;

  /** m_generatedShapeEllipsoidCenter (Vector3) [READ] */
  @io.read
  @type.vec3
  generatedShapeEllipsoidCenter = vec3.create();

  /** m_generatedShapeEllipsoidRadius (Vector3) [READ] */
  @io.read
  @type.vec3
  generatedShapeEllipsoidRadius = vec3.create();

  /** m_killCount (float) [READ] */
  @io.read
  @type.float32
  killCount = 0;

  /** m_distanceToShip (float) [READ] */
  @io.read
  @type.float32
  ship = 0;

  /** m_boundingSphereRadius (float) [READ] */
  @io.read
  @type.float32
  boundingSphereRadius = 0;

  /** m_parentWorldRotation (Quaternion) [READ] */
  @io.read
  @type.quat
  parentWorldRotation = quat.fromValues(0, 0, 0, 0);

  /** m_parentWorldTranslation (Vector3) [READ] */
  @io.read
  @type.vec3
  parentWorldTranslation = vec3.create();

  /**
   * Collects the space-object attributes used by effect bindings. Carbon's
   * Blue casts are represented by the corresponding runtime constructors.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon BlueCastPtr checks become JavaScript instanceof checks; native out parameters are typed-array copy-outs.")
  UpdateAsyncronous(_updateContext, params)
  {
    const parent = params?.spaceObjectParent;
    if (!parent)
    {
      return;
    }

    if (!this.#initialized)
    {
      if (parent instanceof EveSpaceObject2)
      {
        parent.GetShapeEllipsoid(
          this.generatedShapeEllipsoidCenter,
          this.generatedShapeEllipsoidRadius
        );
      }
      this.#initialized = true;
    }

    vec4.set(BOUNDING_SPHERE, 0, 0, 0, 0);
    const sphereResult = parent.GetBoundingSphere(BOUNDING_SPHERE);
    const sphere = sphereResult?.length >= 4 ? sphereResult : BOUNDING_SPHERE;

    vec3.set(OBJECT_POSITION, 0, 0, 0);
    const positionResult = parent.GetModelCenterWorldPosition(OBJECT_POSITION);
    if (positionResult?.length >= 3)
    {
      vec3.copy(OBJECT_POSITION, positionResult);
    }

    mat4.identity(PARENT_TRANSFORM);
    const transformResult = parent.GetLocalToWorldTransform(PARENT_TRANSFORM);
    const parentTransform = transformResult?.length === 16
      ? transformResult
      : PARENT_TRANSFORM;

    vec3.copy(this.parentWorldTranslation, OBJECT_POSITION);
    RotationQuaternion(this.parentWorldRotation, parentTransform);
    this.activationStrength = Number(params?.activationStrength ?? 1);

    // Carbon computes distance before replacing the cached radius.
    this.ship = vec3.length(OBJECT_POSITION) - this.boundingSphereRadius;

    this.boundingSphereRadius = sphere[3];

    if (parent instanceof EveShip2)
    {
      this.activeTurretCount = Number(parent.GetActiveTurretCount());
      this.killCount = Number(parent.GetKillCounterValue());
    }
  }

}
