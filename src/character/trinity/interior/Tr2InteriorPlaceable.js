import { exposure as be } from "#be";
import { IRoot } from "../../../blue/exposure/IRoot.js";
import { ITr2Interior } from "./ITr2Interior.js";
import { ITr2InteriorDynamic } from "./ITr2InteriorDynamic.js";
import { ITr2Pickable } from "../../../trinity/core/ITr2Pickable.js";
import { ITr2BoundingBox } from "#interfaces/ITr2BoundingBox";
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.h
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable.cpp
// Source: trinity/trinity/Interior/Tr2InteriorPlaceable_Blue.cpp
import { type } from "#schema";
import { blue, CcpTime, IInitialize, INotify, IsMatch, BlueClasses } from "#blue";
import { Tr2VariableStore } from "../../../trinity/core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../../../trinity/generated/trinityCore/enums.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { WodPlaceableRes } from "../wod/WodPlaceableRes.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";

/** Interior placeable with typed resource loading and native uniqueness notifications. */
@be.define("Tr2InteriorPlaceable")
@be.inherit(ITr2Renderable, IInitialize, INotify, ITr2InteriorDynamic, ITr2Pickable, ITr2BoundingBox)
@be.mapInterface(ITr2Renderable)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(ITr2Interior)
@be.mapInterface(ITr2InteriorDynamic)
@be.mapInterface(ITr2Pickable)
@be.mapInterface(ITr2BoundingBox)
export class Tr2InteriorPlaceable extends IRoot
{

  /** m_placeableResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.NOTIFY, null)
  @type.path("object")
  placeableResPath = "";

  /**
   * m_transform (PTriMatrix) [READ, PERSIST, NOTIFY]: the placeable's world transform.
   * Carbon holds a PTriMatrix (a Blue object wrapping a Matrix); the port holds the
   * matrix itself as a mat4, and Black reads the embedded TriMatrix's _11.._44 into it.
   * Carbon's row-major Matrix has gl-matrix's byte layout, so no conversion is needed.
   * @type {mat4}
   */
  @be.mapAttribute(be.READ | be.PERSIST | be.NOTIFY)


  @type.mat4.wrapped("TriMatrix")
  transform = mat4.create();

  /** m_placeableRes (WodPlaceableResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("WodPlaceableRes")
  placeableRes = null;

  /** m_display (bool) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  display = true;

  /**
   * m_boundingSphere (Vector4, private): the bounding sphere, centre in xyz and radius in w. The radius is exposed as its
   * element 3 (Tr2InteriorPlaceable_Blue.cpp:42); the centre through boundingSphereCenter.
   */
  @be.mapAttribute__Index(be.READ, "boundingSphereRadius", 3)
  @type.vec4
  _boundingSphere = vec4.create();

  /** A view onto _boundingSphere's xyz, made once; the sphere is written in place and never replaced. */
  _boundingSphereCenter = this._boundingSphere.subarray(0, 3);

  /**
   * The bounding sphere's centre: the first three floats of _boundingSphere.
   *
   * @adapted Stands in for Carbon's MAPFLOATARRAYSIZE( "boundingSphereCenter", m_boundingSphere, ..., 3 )
   *   (Tr2InteriorPlaceable_Blue.cpp:39) as a read-only property over the same floats.
   * @returns {Float32Array} The live view.
   */
  @be.mapPropertyReadOnly()
  @type.vec3
  get boundingSphereCenter()
  {
    return this._boundingSphereCenter;
  }

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2VariableStore")
  variableStore = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_probeOffset (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  probeOffset = vec3.create();

  /** m_isUniqueInstance (bool) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.boolean
  isUnique = false;

  /** Monotonic request identity prevents superseded asynchronous publication. */
  _loadRequest = 0;

  /** m_cellReflectionMaps[2] (TriTextureResPtr): the current and previous per-cell reflection maps (Tr2InteriorPlaceable.h). */
  _cellReflectionMaps = [ null, null ];

  /** m_cellReflectionTime (float): seconds since the last per-cell reflection map change. */
  _cellReflectionTime = 0;

  /** m_previousUpdateTime (Be::Time): the time of the previous PostPhysicsUpdate, in Blue ticks. */
  _previousUpdateTime = 0;

  /** m_transitionFinished (bool): whether the one-second reflection swap has happened. */
  _transitionFinished = false;

  /**
   * Carbon: Tr2InteriorPlaceable::Tr2InteriorPlaceable (Tr2InteriorPlaceable.cpp:24-55): creates the local
   * variable store, with no parent, and registers the three per-cell reflection variables.
   *
   * @adapted The registrations state their TriVariableContentType, as Tr2VariableStore.RegisterVariableInternal
   *   requires (C++ deduces it from the argument type). The wodInteriorPlaceablesAlive statistic is not ported.
   */
  constructor()
  {
    super();
    this.variableStore = new Tr2VariableStore();
    this.variableStore.RegisterVariableInternal("CellReflectionMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    this.variableStore.RegisterVariableInternal("CellReflection2ndMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    this.variableStore.RegisterVariableInternal("CellReflectionInterpolation", TriVariableContentType.TRIVARIABLE_FLOAT, 0);
  }

  /**
   * Carbon: Tr2InteriorPlaceable::PrePhysicsUpdate (Tr2InteriorPlaceable.cpp:143-145): empty.
   *
   * @implemented
   * @param {number} _time Blue time in ticks.
   * @returns {void}
   */
  PrePhysicsUpdate(_time) {}

  /**
   * Carbon: Tr2InteriorPlaceable::PostPhysicsUpdate (Tr2InteriorPlaceable.cpp:147-170): updates the resource's
   * curve sets, then the per-cell reflection blend. After one second the pair swaps once, so a placeable settles on
   * one map, and the three variables are republished into the local store.
   *
   * @implemented
   * @param {number} time Blue time in ticks.
   * @param {object|null} _apexScene Physics scene; always null.
   * @returns {void}
   */
  PostPhysicsUpdate(time, _apexScene)
  {
    if (this.placeableRes)
    {
      const curveSets = this.placeableRes.GetCurveSets();
      for (let i = 0; i < curveSets.length; i++) curveSets[i].Update(CcpTime.timeAsDouble(time));
    }

    this._cellReflectionTime += CcpTime.timeAsFloat(time - this._previousUpdateTime);
    if (this._cellReflectionTime > 1.0)
    {
      // cpp:159: one reflection map per placeable.
      if (!this._transitionFinished)
      {
        const maps = this._cellReflectionMaps;
        [ maps[0], maps[1] ] = [ maps[1], maps[0] ];
        this._transitionFinished = true;
      }
    }
    const store = this.variableStore;
    store.RegisterVariableInternal("CellReflectionMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._cellReflectionMaps[0]);
    store.RegisterVariableInternal("CellReflection2ndMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this._cellReflectionMaps[1]);
    store.RegisterVariableInternal("CellReflectionInterpolation", TriVariableContentType.TRIVARIABLE_FLOAT, this._cellReflectionTime);
    this._previousUpdateTime = time;
  }

  /**
   * Starts the native resource load after persisted fields have been populated.
   *
   * @adapted
   */

  Initialize()
  {
    // Adapted: the installed resource manager loads objects asynchronously.
    this.LoadPlaceableRes();
    return true;
  }

  /**
   * Reloads the path or clones the current resource when uniqueness is enabled.
   *
   * @adapted changed declaration names replace native member addresses; the path
   *   branch retains precedence when a single notification contains both names.
   */

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
        const copy = blue.classes.CloneTo(this.placeableRes, null);
        this.placeableRes = copy ? blue.classes.QueryThisInterface(copy, WodPlaceableRes, copy.constructor) : null;
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
   *
   * @adapted LoadObject is asynchronous in JavaScript. Request identity and path
   *   checks prevent old completions from replacing newer edits; current errors
   *   are logged and leave the resource empty, matching failed native loads.
   * @returns {Promise<WodPlaceableRes|null>} The current accepted resource.
   */

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
    if (!object || blue.classes.QueryThisInterface(object, WodPlaceableRes, object.constructor, BlueClasses.BLUEQIOPT.BEQI_SILENT) === null)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Resource ${path} is not a WodPlaceableRes.`);
      return null;
    }
    this.placeableRes = object;
    return object;
  }

  /**
   * Returns the authored resource path.
   *
   * @implemented
   */

  GetPlaceableResPath()
  {
    return this.placeableResPath;
  }

  /**
   * Assigns the path and starts loading, as the native direct setter does.
   *
   * @adapted
   */

  SetPlaceableResPath(path)
  {
    this.placeableResPath = path;
    // Adapted: publication follows asynchronous LoadObject completion.
    this.LoadPlaceableRes();
  }

  /**
   * Reports whether the loaded visual model contains transparent areas.
   *
   * @implemented
   */

  HasTransparentBatches()
  {
    return this.placeableRes ? this.placeableRes.HasTransparency() : false;
  }

  /**
   * Adapted native destruction: release the object reference and invalidate any
   * pending JavaScript load so a retired owner cannot publish its result.
   *
   * Carbon: ~Tr2InteriorPlaceable (trinity/trinity/Interior/Tr2InteriorPlaceable.cpp:59-62).
   * @adapted Preserves the existing browser load-generation fence; native destruction only updates statistics.
   */
  _Destructor()
  {
    ++this._loadRequest;
    this.placeableRes = null;
  }

  /**
   * Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetBoundingBoxInWorldSpace (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetBoundingBoxInWorldSpace(...args)
  {
    throw new Error("Tr2InteriorPlaceable.GetBoundingBoxInWorldSpace is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method BoundingBoxOverride (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  BoundingBoxOverride(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxOverride is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method BoundingBoxReset (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  BoundingBoxReset(...args)
  {
    throw new Error("Tr2InteriorPlaceable.BoundingBoxReset is not implemented in CarbonEngineJS.");
  }

}

