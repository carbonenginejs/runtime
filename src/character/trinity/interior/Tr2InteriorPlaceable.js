import { ITr2Interior } from "./ITr2Interior.js";
import { ITr2InteriorDynamic } from "./ITr2InteriorDynamic.js";
import { ITr2Pickable } from "../../../trinity/core/ITr2Pickable.js";
import { ITr2BoundingBox } from "#interfaces/ITr2BoundingBox";
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.h
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.cpp
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable_Blue.cpp
import { meta, type, blue } from "#schema";
import { be, IInitialize, INotify, IsMatch, CjsBlueClasses } from "#blue";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { WodPlaceableRes } from "../../../resource/geometry/WodPlaceableRes.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";

/** Interior placeable with typed resource loading and native uniqueness notifications. */
@blue.define("Tr2InteriorPlaceable")
@blue.inherit(ITr2Renderable, IInitialize, INotify, ITr2InteriorDynamic, ITr2Pickable, ITr2BoundingBox)
@blue.interface(ITr2Renderable, IInitialize, INotify, ITr2Interior, ITr2InteriorDynamic, ITr2Pickable, ITr2BoundingBox)
export class Tr2InteriorPlaceable
{

  /** m_placeableResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("object")
  placeableResPath = "";

  /**
   * m_transform (PTriMatrix) [READ, PERSIST, NOTIFY]: the placeable's world transform.
   * Carbon holds a PTriMatrix (a Blue object wrapping a Matrix); the port holds the
   * matrix itself as a mat4, and Black reads the embedded TriMatrix's _11.._44 into it.
   * Carbon's row-major Matrix has gl-matrix's byte layout, so no conversion is needed.
   * @type {mat4}
   */
  @blue.notify
  @blue.read
  @blue.persist
  @type.mat4.wrapped("TriMatrix")
  transform = mat4.create();

  /** m_placeableRes (WodPlaceableResPtr) [READ] */
  @blue.read
  @type.rootRef("WodPlaceableRes")
  placeableRes = null;

  /** m_display (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  display = true;

  /** m_boundingSphere[3] (float) [READ] */
  @blue.read
  @type.float32
  boundingSphereRadius = 0;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @blue.read
  @type.rootRef("Tr2VariableStore")
  variableStore = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_probeOffset (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  probeOffset = vec3.create();

  /** m_isUniqueInstance (bool) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  isUnique = false;

  /** Monotonic request identity prevents superseded asynchronous publication. */
  _loadRequest = 0;

  /** Starts the native resource load after persisted fields have been populated. */
  @blue.method
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
  @blue.method
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
        const copy = be.classes.CloneTo(this.placeableRes);
        this.placeableRes = copy ? be.classes.QueryThisInterface(copy, WodPlaceableRes) : null;
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
  @blue.method
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
      object = await be.resMan.LoadObject(path);
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
    if (!object || be.classes.QueryThisInterface(object, WodPlaceableRes, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) === null)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Resource ${path} is not a WodPlaceableRes.`);
      return null;
    }
    this.placeableRes = object;
    return object;
  }

  /** Returns the authored resource path. */
  @blue.method
  @meta.implemented
  GetPlaceableResPath()
  {
    return this.placeableResPath;
  }

  /** Assigns the path and starts loading, as the native direct setter does. */
  @blue.method
  @meta.adapted
  SetPlaceableResPath(path)
  {
    this.placeableResPath = path;
    // Adapted: publication follows asynchronous LoadObject completion.
    this.LoadPlaceableRes();
  }

  /** Reports whether the loaded visual model contains transparent areas. */
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return this.placeableRes ? this.placeableRes.HasTransparency() : false;
  }

  /**
   * Adapted native destruction: release the object reference and invalidate any
   * pending JavaScript load so a retired owner cannot publish its result.
   */
  @meta.adapted
  Destroy()
  {
    ++this._loadRequest;
    this.placeableRes = null;
  }

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetBoundingBoxInWorldSpace (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  GetBoundingBoxInWorldSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInWorldSpace is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxOverride (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  BoundingBoxOverride(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxOverride is not implemented in CarbonEngineJS.");
  }

  /** Carbon method BoundingBoxReset (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  BoundingBoxReset(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxReset is not implemented in CarbonEngineJS.");
  }

}

