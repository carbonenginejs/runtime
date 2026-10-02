// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.h
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";

/** Authored state record for an interior placeable. */
@meta.define({ className: "Tr2InteriorPlaceable", family: "interior" })
@meta.blue.inherit(ITr2Renderable)
export class Tr2InteriorPlaceable
{

  /** m_placeableResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  placeableResPath = "";

  /** m_transform (PTriMatrix) [READ, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.objectRef("TriMatrix")
  transform = null;

  /** m_placeableRes (WodPlaceableResPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("WodPlaceableRes")
  placeableRes = null;

  /** m_display (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  /** m_boundingSphere[3] (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  boundingSphereRadius = 0;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("Tr2VariableStore")
  variableStore = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_probeOffset (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  probeOffset = vec3.create();

  /** m_isUniqueInstance (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isUnique = false;

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetBoundingBoxInWorldSpace (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  GetBoundingBoxInWorldSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInWorldSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxOverride (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  BoundingBoxOverride(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxOverride is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxReset (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  BoundingBoxReset(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxReset is not implemented in CarbonEngineJS.");
  }

}
