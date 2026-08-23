// Source: audio/src/AudGeometry.h + AudGeometry.cpp
// Hand-owned browser/backend adaptation. Verify against audio/AudGeometry.json.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";
import { AudGameObjResource } from "./AudGameObjResource.js";

const geometrySets = new Map();
const geometryInstances = new Map();
const EPSILON = 1e-10;

function Length3(x, y, z)
{
  const length = Math.hypot(x, y, z);
  return Number.isFinite(length) && length * length > EPSILON ? length : 1;
}

function Normalize3(value, fallback)
{
  const length = Math.hypot(value[0], value[1], value[2]);
  if (!Number.isFinite(length) || length * length <= EPSILON)
  {
    return fallback.slice();
  }
  return value.map(component => component / length);
}

function Cross3(a, b)
{
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

// Carbon Matrix and gl-matrix mat4 have the same byte layout. This is a
// single-matrix projection, not a composition.
function MakeInstanceParams(geometrySetId, worldTransform)
{
  const matrix = worldTransform ?? [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
  const finite = value => Number.isFinite(value) ? value : 0;
  const position = [ finite(matrix[12]), finite(matrix[13]), -finite(matrix[14]) ];
  const front = Normalize3([ -matrix[8], -matrix[9], matrix[10] ], [ 0, 0, 1 ]);
  let up = Normalize3([ matrix[4], matrix[5], -matrix[6] ], [ 0, 1, 0 ]);
  let right = Cross3(up, front);
  if (Math.hypot(...right) ** 2 <= EPSILON)
  {
    up = Math.abs(front[1]) < 0.9 ? [ 0, 1, 0 ] : [ 0, 0, 1 ];
    right = Cross3(up, front);
  }
  right = Normalize3(right, [ 1, 0, 0 ]);
  up = Normalize3(Cross3(front, right), [ 0, 1, 0 ]);
  return {
    geometrySetId,
    position,
    front,
    top: up,
    scale: [
      Length3(matrix[0], matrix[1], matrix[2]),
      Length3(matrix[4], matrix[5], matrix[6]),
      Length3(matrix[8], matrix[9], matrix[10])
    ],
    worldTransform: Array.from(matrix)
  };
}

function MakeGeometryParams(geometryData, manager)
{
  const vertices = Array.from(geometryData.vertices ?? [], vertex => [
    Number(vertex[0]) || 0,
    Number(vertex[1]) || 0,
    -(Number(vertex[2]) || 0)
  ]);
  const indices = Array.from(geometryData.indices ?? [], Number);
  const triangles = [];
  for (let i = 0; i + 2 < indices.length; i += 3)
  {
    triangles.push([ indices[i], indices[i + 1], indices[i + 2], 0 ]);
  }
  return {
    vertices,
    triangles,
    surfaces: [{
      name: "default",
      textureID: 0,
      transmissionLoss: manager.GetTransmissionLoss()
    }],
    enableDiffraction: manager.GetEnableDiffraction(),
    enableDiffractionOnBoundaryEdges: manager.GetEnableDiffractionOnBoundaryEdges()
  };
}

/**
 * Maintains Carbon geometry-set reference counts and routes Wwise-shaped
 * geometry lifecycle values to an optional browser backend.
 */
@type.define({ className: "AudGeometry", family: "audio" })
export class AudGeometry extends CjsModel
{

  /** Removes every registered set and instance from the current backend. */
  static ClearAllGeometry()
  {
    const backend = AudGameObjResource.backend;
    for (const instanceId of geometryInstances.keys())
    {
      backend?.RemoveGeometryInstance?.(instanceId);
    }
    for (const geometrySetId of geometrySets.keys())
    {
      backend?.RemoveGeometry?.(geometrySetId);
    }
    geometryInstances.clear();
    geometrySets.clear();
  }

  /** Carbon ITr2AudGeometry method SetGeometry. */
  @carbon.method
  @impl.adapted
  @impl.reason("Wwise geometry calls route through optional SetGeometry/SetGeometryInstance backend methods using plain browser-safe parameter objects.")
  SetGeometry(geometrySetId, instanceId, geometryData, worldTransform)
  {
    const manager = AudGameObjResource.manager;
    const backend = AudGameObjResource.backend;
    if (!geometryData?.vertices?.length || !geometryData?.indices?.length
      || !manager?.GetSpatialAudioGeometryEnabled?.()
      || typeof backend?.SetGeometry !== "function"
      || typeof backend?.SetGeometryInstance !== "function")
    {
      return;
    }

    let set = geometrySets.get(geometrySetId);
    if (!set)
    {
      const params = MakeGeometryParams(geometryData, manager);
      if (backend.SetGeometry(geometrySetId, params) === false)
      {
        return;
      }
      set = { refs: 1, params };
      geometrySets.set(geometrySetId, set);
    }
    else
    {
      set.refs++;
    }

    const instanceParams = MakeInstanceParams(geometrySetId, worldTransform);
    if (backend.SetGeometryInstance(instanceId, instanceParams) === false)
    {
      return;
    }
    geometryInstances.set(instanceId, { geometrySetId, params: instanceParams });
  }

  /** Carbon ITr2AudGeometry method SetGeometryTransform. */
  @carbon.method
  @impl.adapted
  @impl.reason("The Wwise transform call routes through an optional browser backend with a plain parameter object.")
  SetGeometryTransform(geometrySetId, instanceId, worldTransform)
  {
    const manager = AudGameObjResource.manager;
    const backend = AudGameObjResource.backend;
    if (!manager?.GetSpatialAudioGeometryEnabled?.()
      || !geometrySets.has(geometrySetId)
      || typeof backend?.SetGeometryInstance !== "function")
    {
      return;
    }
    const params = MakeInstanceParams(geometrySetId, worldTransform);
    if (backend.SetGeometryInstance(instanceId, params) !== false)
    {
      geometryInstances.set(instanceId, { geometrySetId, params });
    }
  }

  /** Carbon ITr2AudGeometry method RemoveGeometry. */
  @carbon.method
  @impl.adapted
  @impl.reason("Wwise geometry removal routes through optional browser backend methods while retaining Carbon's set reference counts.")
  RemoveGeometry(geometrySetId, instanceId)
  {
    const set = geometrySets.get(geometrySetId);
    if (!set)
    {
      return;
    }
    const backend = AudGameObjResource.backend;
    backend?.RemoveGeometryInstance?.(instanceId);
    geometryInstances.delete(instanceId);
    set.refs--;
    if (set.refs <= 0)
    {
      backend?.RemoveGeometry?.(geometrySetId);
      geometrySets.delete(geometrySetId);
    }
  }

}
