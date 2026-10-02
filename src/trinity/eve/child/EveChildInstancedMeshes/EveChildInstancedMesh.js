// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
//   struct Mesh, nested in EveChildInstancedMeshes (line 132); flattened for JS
//   under a name that drops the donor's plural. See EveChildInstancedMeshArea.js.
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { EveChildInstancedMeshArea } from "./EveChildInstancedMeshArea.js";
import { EveChildInstancedMeshInstance } from "./EveChildInstancedMeshInstance.js";


/**
 * One geometry-and-areas record inside an EveChildInstancedMeshes child, holding
 * its instance placements, per-instance world cull spheres, instance flags and
 * manager registration handles.
 */
@meta.define({ className: "EveChildInstancedMesh", family: "eve/child" })
export class EveChildInstancedMesh
{
  @meta.blue.persist
  @meta.type.path
  geometryPath = "";

  @meta.blue.persist
  @meta.type.boolean
  castsShadow = false;

  @meta.blue.persist
  @meta.type.int32
  reflectionMode = 3;

  @meta.blue.persist
  @meta.type.uint32
  meshIndex = 0;

  @meta.blue.persist
  @meta.type.list("EveChildInstancedMeshArea")
  areas = [];

  @meta.blue.persist
  @meta.type.list("EveChildInstancedMeshInstance")
  instances = [];

  /** Carbon's one-to-one modular ownership tag array for instances. */
  @meta.blue.persist
  @meta.type.array("uint32")
  partTags = [];

  @meta.blue.persist
  @meta.type.string
  sofHullName = "";

  @meta.blue.persist
  @meta.type.string
  sofLocatorSetName = "";

  // Carbon Mesh::ownedLocatorSets and Mesh::armorDamageShader
  // (EveChildInstancedMeshes.h:163-164), set by SOF BuildChild through AddMesh;
  // CarbonEngineJS delivers built objects as documents, so both persist.
  @meta.blue.persist
  @meta.type.list("EveLocatorSets")
  ownedLocatorSets = [];

  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  armorDamageShader = null;

  @meta.blue.persist
  @meta.type.boolean
  display = true;

  @meta.blue.persist
  @meta.type.boolean
  inheritOverlayEffects = true;

  @meta.blue.persist
  @meta.type.list("EveMeshOverlayEffect")
  ownOverlayEffects = [];

  overlayAreaBlocks = [ [], [] ];

  overlayAreaBlocksBuilt = false;

  overlayPods = null;

  /** Carbon Mesh::sphereHandle (h:110) - manager registration handle;
   * runtime state, not persisted. */
  sphereHandle = null;

  /** Carbon Mesh::worldBoundingSphere - stamped by UpdateAsyncronous
   * (cpp:270); the TriFrustum sphere-duck shape. */
  worldBoundingSphere = { center: vec3.create(), radius: 0 };

  /** Carbon Mesh::instanceSpheres - per-instance world cull spheres, stamped
   * by UpdateAsyncronous (cpp:259-269). */
  instanceSpheres = [];

  /** Carbon Mesh::flags (InstanceFlags uint32) - batch-type bits stamped at
   * AddMesh (cpp:578-581), CASTS_SHADOW at AddMesh (cpp:574-577),
   * RENDER_IN_REFLECTION refreshed each async pass (cpp:251). */
  flags = 0;

  _geometry = null;

  /**
   * Returns the geometry resource backing this mesh, or null while none has been
   * assigned; the mesh does not register with the manager until it is present
   * and good.
   */
  GetGeometryResource()
  {
    return this._geometry;
  }

  /**
   * Assigns the geometry resource this mesh renders from; a nullish value clears
   * it. Runtime state, deliberately not persisted.
   */
  SetGeometryResource(resource)
  {
    this._geometry = resource ?? null;
  }
}
