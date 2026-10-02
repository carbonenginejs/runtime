// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.h
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.cpp
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable_Blue.cpp
import { meta } from "#schema";
import { blue, IInitialize, INotify, IsMatch } from "#blue";
import { mappedInterfaces } from "../../../global/compose/interface.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { WodPlaceableRes } from "../../../resource/geometry/WodPlaceableRes.js";
import { vec3 } from "#math/vec3";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";

/** Interior placeable with typed resource loading and native uniqueness notifications. */
@meta.define({ className: "Tr2InteriorPlaceable", family: "interior" })
@meta.blue.inherit(ITr2Renderable, IInitialize, INotify)
export class Tr2InteriorPlaceable
{

  /** m_placeableResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
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

  /** Monotonic request identity prevents superseded asynchronous publication. */
  _loadRequest = 0;

  /** Starts the native resource load after persisted fields have been populated. */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    // Adapted: the installed resource manager loads objects asynchronously.
    this.LoadPlaceableRes();
    return true;
  }

  /**
   * Reloads the path or clones the current resource when uniqueness is enabled.
   * Adapted: changed declaration names replace native member addresses; the path
   * branch retains precedence when a single notification contains both names.
   */
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "placeableResPath"))
    {
      this.LoadPlaceableRes();
    }
    else if (IsMatch(propertyName, "isUnique"))
    {
      if (this.placeableRes && this.isUnique)
      {
        ++this._loadRequest;
        const copy = blue.classes.CloneTo(this.placeableRes);
        this.placeableRes = copy && mappedInterfaces(copy.constructor).has(WodPlaceableRes) ? copy : null;
      }
      else
      {
        this.LoadPlaceableRes();
      }
    }
    return true;
  }

  /**
   * Releases the previous object and requests a fresh typed placeable graph.
   * Adapted: LoadObject is asynchronous in JavaScript. Request identity and path
   * checks prevent old completions from replacing newer edits; current errors
   * are logged and leave the resource empty, matching failed native loads.
   * @returns {Promise<WodPlaceableRes|null>} The current accepted resource.
   */
  @meta.blue.method
  @meta.adapted
  async LoadPlaceableRes()
  {
    const path = this.placeableResPath;
    const request = ++this._loadRequest;
    this.placeableRes = null;
    if (!path) return null;
    let object;
    try
    {
      object = await blue.resMan.LoadObject(path);
    }
    catch (error)
    {
      if (request === this._loadRequest && path === this.placeableResPath)
      {
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Interior placeable ${path} failed to load: ${error?.message ?? error}`);
      }
      return null;
    }
    if (request !== this._loadRequest || path !== this.placeableResPath) return null;
    if (!object || !mappedInterfaces(object.constructor).has(WodPlaceableRes))
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Resource ${path} is not a WodPlaceableRes.`);
      return null;
    }
    this.placeableRes = object;
    return object;
  }

  /** Returns the authored resource path. */
  @meta.blue.method
  @meta.implemented
  GetPlaceableResPath()
  {
    return this.placeableResPath;
  }

  /** Assigns the path and starts loading, as the native direct setter does. */
  @meta.blue.method
  @meta.adapted
  SetPlaceableResPath(path)
  {
    this.placeableResPath = path;
    // Adapted: publication follows asynchronous LoadObject completion.
    this.LoadPlaceableRes();
  }

  /** Reports whether the loaded visual model contains transparent areas. */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return this.placeableRes ? this.placeableRes.HasTransparency() : false;
  }

  /**
   * Adapted native destruction: release the object reference and invalidate any
   * pending JavaScript load so a retired owner cannot publish its result.
   */
  @meta.blue.method
  @meta.adapted
  Destroy()
  {
    ++this._loadRequest;
    this.placeableRes = null;
  }

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

meta.blue.interfaceTable({ interfaces: [Tr2InteriorPlaceable, ITr2Renderable, IInitialize, INotify], chainTo: null })(Tr2InteriorPlaceable);
