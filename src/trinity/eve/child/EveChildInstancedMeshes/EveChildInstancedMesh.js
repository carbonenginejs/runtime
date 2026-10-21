import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
//   struct Mesh, nested in EveChildInstancedMeshes (line 132); flattened for JS
//   under a name that drops the donor's plural. See EveChildInstancedMeshArea.js.
import { vec3 } from "#math/vec3";
import { meta, type } from "#schema";
import { EveChildInstancedMeshArea } from "./EveChildInstancedMeshArea.js";
import { EveChildInstancedMeshInstance } from "./EveChildInstancedMeshInstance.js";
import { EveInstancedMeshManagerInstanceFlags } from "../../instancedMeshManager/EveInstancedMeshManagerInstanceFlags.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";


/**
 * One geometry-and-areas record inside an EveChildInstancedMeshes child, holding
 * its instance placements, per-instance world cull spheres, instance flags and
 * manager registration handles.
 * The name stays because it is the SOF-persisted `_type` (EveSOF.js:1511, 2673), and SOF's layout is the sanctioned divergence.
 */
@meta.define({"className":"EveChildInstancedMesh","carbon":"EveChildInstancedMeshes::Mesh"})
export class EveChildInstancedMesh
{
  @meta.attribute(meta.PERSIST)
  @type.path("TriGeometryRes")
  geometryPath = "";

  @meta.attribute(meta.PERSIST)
  @type.boolean
  castsShadow = false;

  @meta.attribute(meta.PERSIST)
  @type.int32
  reflectionMode = 3;

  @meta.attribute(meta.PERSIST)
  @type.uint32
  meshIndex = 0;

  @meta.attribute(meta.PERSIST)
  @type.list("EveChildInstancedMeshArea")
  areas = [];

  @meta.attribute(meta.PERSIST)
  @type.list("EveChildInstancedMeshInstance")
  instances = [];

  /** Carbon's one-to-one modular ownership tag array for instances. */
  @meta.attribute(meta.PERSIST)
  @type.array("uint32")
  partTags = [];

  @meta.attribute(meta.PERSIST)
  @type.string
  sofHullName = "";

  @meta.attribute(meta.PERSIST)
  @type.string
  sofLocatorSetName = "";

  // Carbon Mesh::ownedLocatorSets and Mesh::armorDamageShader
  // (EveChildInstancedMeshes.h:163-164), set by SOF BuildChild through AddMesh;
  // CarbonEngineJS delivers built objects as documents, so both persist.
  @meta.attribute(meta.PERSIST)
  @type.list("EveLocatorSets")
  ownedLocatorSets = [];

  @meta.attribute(meta.PERSIST)
  @type.rootRef("Tr2Effect")
  armorDamageShader = null;

  @meta.attribute(meta.PERSIST)
  @type.boolean
  display = true;

  @meta.attribute(meta.PERSIST)
  @type.boolean
  inheritOverlayEffects = true;

  @meta.attribute(meta.PERSIST)
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

  /** Carbon Mesh::flags (EveInstancedMeshManager::InstanceFlags, h:151),
   * embedded by value - batch-type bits stamped at AddMesh (cpp:589),
   * CASTS_SHADOW at AddMesh (cpp:585), RENDER_IN_REFLECTION refreshed each
   * async pass (cpp:289). */
  flags = new EveInstancedMeshManagerInstanceFlags();

  /**
   * Carbon Mesh::combinedVertexDeclaration (EveChildInstancedMeshes.h): the
   * mesh's declaration plus the instance inputs TEXCOORD8-15, built by
   * EveChildInstancedMeshes.RebuildCachedData (cpp:702-739);
   * UNINITIALIZED_DECLARATION until then, which AddMeshesToManager's gate
   * (cpp:766-770) skips.
   */
  combinedVertexDeclaration = Tr2EffectStateManager.Unknown;

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
