// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.h
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

/** Authored state record for an interior placeable. */
@type.define({ className: "Tr2InteriorPlaceable", family: "interior" })
export class Tr2InteriorPlaceable extends CjsModel
{

  /** m_placeableResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  placeableResPath = "";

  /** m_transform (PTriMatrix) [READ, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.objectRef("TriMatrix")
  transform = null;

  /** m_placeableRes (WodPlaceableResPtr) [READ] */
  @io.read
  @type.objectRef("WodPlaceableRes")
  placeableRes = null;

  /** m_display (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  display = true;

  /** m_boundingSphere[3] (float) [READ] */
  @io.read
  @type.float32
  boundingSphereRadius = 0;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @io.read
  @type.objectRef("Tr2VariableStore")
  variableStore = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_probeOffset (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  probeOffset = vec3.create();

  /** m_isUniqueInstance (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  isUnique = false;

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetBoundingBoxInWorldSpace (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GetBoundingBoxInWorldSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInWorldSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxOverride (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  BoundingBoxOverride(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxOverride is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxReset (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  BoundingBoxReset(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxReset is not implemented in CarbonEngineJS.");
  }

}
