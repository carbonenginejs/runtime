// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
//
// The members are Carbon StaticPerInstanceData's (worldTransform,
// sphereIndex, mirrored, pickingMeshIndex, pickingInstanceIndex), declared at
// EveInstancedMeshManager.h:38-45, not in this header. It lives with the
// meshes because EveChildInstancedMeshes persists it per instance;
// EveInstancedMeshManager aliases it as
// `EveInstancedMeshManager.StaticPerInstanceData`. Carbon's packed Float4x3
// `worldTransform` is held here as the full `transform` matrix and packed
// when the manager uploads it (EveInstancedMeshManager.UploadLodData).
//
// Carbon fills every member in EveChildInstancedMeshes::AddMesh
// (EveChildInstancedMeshes.cpp:559-565). Our SOF builds the child as a
// document rather than through AddMesh, so all five persist, and a document
// without the three newer ones loads with Carbon's defaults.
import { mat4 } from "#math/mat4";
import { meta, type } from "#schema";


/**
 * A single placement of an instanced mesh: its transform, the index of its
 * cull sphere in the owning mesh's instance sphere list, whether it mirrors,
 * and the mesh and instance indices its picking hits decode to.
 */
@meta.define({ className: "EveChildInstancedMeshInstance", donors: [ "EveInstancedMeshManager::StaticPerInstanceData" ] })
export class EveChildInstancedMeshInstance
{

  @meta.persist
  @type.mat4
  transform = mat4.create();

  @meta.persist
  @type.uint32
  sphereIndex = 0;

  /** mirrored (bool, h:42): the transform's determinant is negative (IsMirrored), so its winding flips. */
  @meta.persist
  @type.boolean
  mirrored = false;

  /** pickingMeshIndex (uint32_t, h:43): the owning mesh's index in EveChildInstancedMeshes.meshes. */
  @meta.persist
  @type.uint32
  pickingMeshIndex = 0;

  /** pickingInstanceIndex (uint32_t, h:44): this instance's index in its mesh. */
  @meta.persist
  @type.uint32
  pickingInstanceIndex = 0;
}
