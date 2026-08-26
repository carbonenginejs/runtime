import { CjsSchema, impl } from "../schema/index.js";


/**
 * Dependency-free contract implemented by an engine's instanced-mesh
 * realization. Trinity owns the registration data; the engine owns its GPU
 * buffers, culling allocations and draw submission.
 */
export class CjsInstancedMeshManager
{
  /** Registers one terminal per-object RawData record and returns an opaque handle. */
  AddPerObjectData(_data)
  {
    throw new Error("CjsInstancedMeshManager.AddPerObjectData must be implemented by an engine.");
  }

  /** Registers one set of instance culling spheres and returns an opaque handle. */
  AddBoundingSphereGroup(_bounds, _flags, _spheres, _count)
  {
    throw new Error("CjsInstancedMeshManager.AddBoundingSphereGroup must be implemented by an engine.");
  }

  /**
   * Registers one instanced geometry area and returns an opaque handle.
   * The arguments are the geometry, vertex declaration, batch type, mesh
   * index, area index/count, effect/hash, per-object handle, sphere handle,
   * instance records/count, picking owner and picking-owner index.
   */
  AddMeshGroup(
    _geometry,
    _vertexDeclaration,
    _batchType,
    _meshIndex,
    _areaIndex,
    _areaCount,
    _effect,
    _effectHash,
    _perObjectDataHandle,
    _sphereHandle,
    _instances,
    _instanceCount,
    _pickingOwner,
    _pickingOwnerIndex)
  {
    throw new Error("CjsInstancedMeshManager.AddMeshGroup must be implemented by an engine.");
  }

  /** Updates the world bounds and flags of a registered sphere group. */
  SetSphereGroupBounds(_handle, _bounds, _flags)
  {
    throw new Error("CjsInstancedMeshManager.SetSphereGroupBounds must be implemented by an engine.");
  }

  /** Removes one registered instanced geometry area. */
  RemoveMeshGroup(_handle)
  {
    throw new Error("CjsInstancedMeshManager.RemoveMeshGroup must be implemented by an engine.");
  }

  /** Removes one registered instance culling-sphere group. */
  RemoveBoundingSphereGroup(_handle)
  {
    throw new Error("CjsInstancedMeshManager.RemoveBoundingSphereGroup must be implemented by an engine.");
  }

  /** Removes one registered per-object data provider. */
  RemovePerObjectData(_handle)
  {
    throw new Error("CjsInstancedMeshManager.RemovePerObjectData must be implemented by an engine.");
  }
}

for (const method of [
  "AddPerObjectData",
  "AddBoundingSphereGroup",
  "AddMeshGroup",
  "SetSphereGroupBounds",
  "RemoveMeshGroup",
  "RemoveBoundingSphereGroup",
  "RemovePerObjectData"
])
{
  CjsSchema.decorateMethod(CjsInstancedMeshManager, method, impl.abstract);
}
CjsSchema.define(CjsInstancedMeshManager, { className: "CjsInstancedMeshManager" });
