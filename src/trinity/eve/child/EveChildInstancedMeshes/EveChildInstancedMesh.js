// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
//   struct Mesh, nested in EveChildInstancedMeshes (line 132); flattened for JS
//   under a name that drops the donor's plural. See EveChildInstancedMeshArea.js.
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { io, type } from "#schema";
import { EveChildInstancedMeshArea } from "./EveChildInstancedMeshArea.js";
import { EveChildInstancedMeshInstance } from "./EveChildInstancedMeshInstance.js";


/**
 * One geometry-and-areas record inside an EveChildInstancedMeshes child, holding
 * its instance placements, per-instance world cull spheres, instance flags and
 * manager registration handles.
 */
@type.define({ className: "EveChildInstancedMesh", family: "eve/child" })
export class EveChildInstancedMesh extends CjsModel
{
  @io.persist
  @type.string
  geometryPath = "";

  @io.persist
  @type.boolean
  castsShadow = false;

  @io.persist
  @type.int32
  reflectionMode = 3;

  @io.persist
  @type.uint32
  meshIndex = 0;

  @io.persist
  @type.list("EveChildInstancedMeshArea")
  areas = [];

  @io.persist
  @type.list("EveChildInstancedMeshInstance")
  instances = [];

  /** Carbon's one-to-one modular ownership tag array for instances. */
  @io.persist
  @type.array("uint32")
  partTags = [];

  @io.persist
  @type.string
  sofHullName = "";

  @io.persist
  @type.string
  sofLocatorSetName = "";

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.boolean
  inheritOverlayEffects = true;

  @io.persist
  @type.list("EveMeshOverlayEffect")
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
   * AddMesh (cpp:422-425), CASTS_SHADOW at AddMesh (cpp:418-421),
   * RENDER_IN_REFLECTION refreshed each async pass (cpp:251). */
  flags = 0;

  #geometry = null;

  /**
   * Returns the geometry resource backing this mesh, or null while none has been
   * assigned; the mesh does not register with the manager until it is present
   * and good.
   */
  GetGeometryResource()
  {
    return this.#geometry;
  }

  /**
   * Assigns the geometry resource this mesh renders from; a nullish value clears
   * it. Runtime state, deliberately not persisted.
   */
  SetGeometryResource(resource)
  {
    this.#geometry = resource ?? null;
  }
}
