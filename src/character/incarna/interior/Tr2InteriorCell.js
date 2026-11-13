// Incarna: retired from Carbon. Donor: trinity 24d033fa~1, Interior/Tr2InteriorCell.h, .cpp and _Blue.cpp. See ../README.md.
import { exposure as be } from "#be";
import { blue, BlueList, IInitialize, IListNotify, INotify, IsMatch } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { IRoot } from "#exposure/IRoot";
import { CjsSchema, type } from "#schema";
import { vec3 } from "#math/vec3";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { Tr2VariableStore } from "../../../trinity/core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../../../trinity/generated/trinityCore/enums.js";
import { Tr2IntSkinnedObject } from "../../trinity/interior/Tr2IntSkinnedObject.js";
import { Tr2InteriorStatic } from "./Tr2InteriorStatic.js";

/** Carbon's FLT_MAX, the empty box's corners (cpp:25-26). */
const FLT_MAX = 3.4028234663852886e38;

/**
 * A cell of an Incarna interior: the statics that make one room, the room's
 * baked lighting, and a variable store of its own. Its statics bind their
 * effects under that store, so a cell's `IrradianceMap`,
 * `DirectionalIrradianceMap` and `ReflectionMap` reach its own statics and
 * nothing else; every other variable falls through to the global store.
 *
 * Carbon removed the class in trinity 24d033fa (2017-06-28), with
 * Tr2InteriorStatic. Its members, flags and methods are those of
 * `Interior/Tr2InteriorCell.h`, `.cpp` and `_Blue.cpp` at 24d033fa~1. A
 * Tr2InteriorScene holds its cells in `cells`.
 *
 * Its spherical-harmonic probes (`Tr2SHProbeRes`) are not ported, and neither is
 * the scene's test of lights and dynamics against cells, so the cell's light and
 * dynamic lists are kept but nothing fills them yet.
 *
 * @adapted SH probes are not loaded
 */
@be.define("Tr2InteriorCell")
@be.inherit(IInitialize, INotify, IListNotify)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(IListNotify)
export class Tr2InteriorCell extends IRoot
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  static scratch = { vec3_0: vec3.create(), vec3_1: vec3.create() };

  /** m_statics (PTr2InteriorStaticVector) [READWRITE, PERSIST]: the statics, "which receive secondary lighting from cube maps". */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.list("Tr2InteriorStatic")
  statics = new BlueList(Tr2InteriorStatic, { className: "Tr2InteriorStatic" });

  /** m_reflectionMapPath (std::string) [READWRITE, PERSIST, NOTIFY]: the cell's reflection map. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.path
  reflectionMapPath = "";

  /** m_reflectionMapRes (TriTextureResPtr) [READ], exposed as "reflectionMap". */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriTextureRes")
  reflectionMap = null;

  /** m_irradianceTexture (TriTextureResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriTextureRes")
  irradianceTexture = null;

  /** m_directionalIrradianceTexture (TriTextureResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriTextureRes")
  directionalIrradianceTexture = null;

  /** m_irradianceTexturePath (std::string) [READWRITE, PERSIST, NOTIFY]: the irradiance light map. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.path
  irradianceTexturePath = "";

  /** m_directionalIrradianceTexturePath (std::string) [READWRITE, PERSIST, NOTIFY]: the directional irradiance light map. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.path
  directionalIrradianceTexturePath = "";

  /** m_minBounds (Vector3) [READ] = (FLT_MAX, FLT_MAX, FLT_MAX) (cpp:25): "DEPRECATED". */
  @be.mapAttribute(be.READ)
  @type.vec3
  minBounds = vec3.fromValues(FLT_MAX, FLT_MAX, FLT_MAX);

  /** m_maxBounds (Vector3) [READ] = (-FLT_MAX, -FLT_MAX, -FLT_MAX) (cpp:26): "DEPRECATED". */
  @be.mapAttribute(be.READ)
  @type.vec3
  maxBounds = vec3.fromValues(-FLT_MAX, -FLT_MAX, -FLT_MAX);

  /** m_isUnbounded (bool) [READWRITE, PERSIST, NOTIFY] = false (cpp:28): a cell with no statics that still holds dynamics and lights. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.boolean
  isUnbounded = false;

  /** m_drawBoundingBox (bool) [READWRITE] = false (cpp:22): "renderDebugInfo must be on!" */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  drawBoundingBox = false;

  /** m_shProbeResPath (std::string) [READWRITE, PERSIST, NOTIFY]: cached spherical-harmonic probe solutions. */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.path
  shProbeResPath = "";

  /** m_shProbeResource (Tr2SHProbeResPtr) [READ]: never loaded; see SetSHProbeResource. */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2SHProbeRes")
  shProbeResource = null;

  /** m_variableStore (Tr2VariableStorePtr) [READ]: the cell's own store, parented to the global store. */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2VariableStore")
  variableStore = null;

  /** m_isDirty = true (cpp:21). */
  _isDirty = true;

  /** m_boundingBoxReady = false (cpp:27). */
  _boundingBoxReady = false;

  /** m_shScale = 1 (cpp:23): the debug probe spheres' brightness. */
  _shScale = 1;

  /** m_lights (PITr2InteriorLightVector): lights touching the cell. */
  _lights = [];

  /** m_dynamics (PITr2InteriorDynamicVector): dynamics touching the cell. */
  _dynamics = [];

  /** m_skinnedObjects (PITr2InteriorDynamicVector): the dynamics that are skinned objects. */
  _skinnedObjects = [];

  /**
   * Carbon's constructor (cpp:16-38): watches the statics list, creates the
   * cell's variable store and registers its three maps, empty.
   *
   * @adapted the registrations state their TriVariableContentType, as
   *   Tr2VariableStore.RegisterVariableInternal requires (C++ deduces it from
   *   the argument). `new Tr2VariableStore()` is parented to the global store,
   *   as Carbon's CreateInstance is.
   */
  constructor()
  {
    super();
    this.statics.SetNotify(this);
    this.variableStore = new Tr2VariableStore();
    this.variableStore.RegisterVariableInternal("ReflectionMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    this.variableStore.RegisterVariableInternal("IrradianceMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    this.variableStore.RegisterVariableInternal("DirectionalIrradianceMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
  }

  /**
   * Carbon Initialize (cpp:59-82): probes and reflection map, every static
   * joins the cell, the light maps load, and the box rebuilds.
   *
   * @implemented
   * @returns {boolean} true.
   */
  Initialize()
  {
    this.SetSHProbeResource();
    this.SetReflectionMapPath();
    for (const interiorStatic of this.statics) interiorStatic.SetParentCell(this);
    this._isDirty = true;
    if (this.irradianceTexturePath) this.irradianceTexture = blue.resMan.GetResource(this.irradianceTexturePath);
    if (this.directionalIrradianceTexturePath) this.directionalIrradianceTexture = blue.resMan.GetResource(this.directionalIrradianceTexturePath);
    this.RebuildInternalData();
    return true;
  }

  /**
   * Carbon SetReflectionMapPath (cpp:85-99): the reflection map for
   * `reflectionMapPath`.
   *
   * @adapted an empty path requests nothing: our resource manager rejects
   *   empty paths, and Carbon's request for "" yields nothing.
   * @returns {void}
   */
  SetReflectionMapPath()
  {
    this.reflectionMap = this.reflectionMapPath ? blue.resMan.GetResource(this.reflectionMapPath) : null;
  }

  /**
   * Carbon OnModified (cpp:102-138): reloads what a path names, and re-registers
   * a light map in the cell's store at once.
   *
   * @implemented
   * @param {string} name The changed member.
   * @returns {boolean} true.
   */
  OnModified(name)
  {
    if (IsMatch(name, "reflectionMapPath"))
    {
      this.SetReflectionMapPath();
    }
    else if (IsMatch(name, "shProbeResPath"))
    {
      this.SetSHProbeResource();
    }
    else if (IsMatch(name, "isUnbounded"))
    {
      this._isDirty = true;
    }
    else if (IsMatch(name, "irradianceTexturePath"))
    {
      this.irradianceTexture = this.irradianceTexturePath ? blue.resMan.GetResource(this.irradianceTexturePath) : null;
      this.variableStore.RegisterVariableInternal("IrradianceMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.irradianceTexture);
    }
    else if (IsMatch(name, "directionalIrradianceTexturePath"))
    {
      this.directionalIrradianceTexture = this.directionalIrradianceTexturePath ? blue.resMan.GetResource(this.directionalIrradianceTexturePath) : null;
      this.variableStore.RegisterVariableInternal("DirectionalIrradianceMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.directionalIrradianceTexture);
    }
    return true;
  }

  /**
   * Carbon OnListModified (cpp:141-177): an inserted static joins the cell and
   * binds; a removed one leaves it, and the box rebuilds. Not while the list loads.
   *
   * @implemented
   * @param {number} event The BLUELISTEVENT.
   * @param {number} _key Unused.
   * @param {number} _key2 Unused.
   * @param {object|null} value The inserted or removed item.
   * @param {object|null} list The list that changed.
   * @returns {void}
   */
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list !== this.statics || (event & BLUELISTEVENT.BELIST_LOADING) !== 0) return;

    const masked = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if (masked === BLUELISTEVENT.BELIST_INSERTED)
    {
      this._isDirty = true;
      const object = CjsSchema.cast(value, Tr2InteriorStatic);
      if (object)
      {
        object.SetParentCell(this);
        object.BindLowLevelShaders();
      }
    }
    else if (masked === BLUELISTEVENT.BELIST_REMOVED)
    {
      const object = CjsSchema.cast(value, Tr2InteriorStatic);
      if (object) object.SetParentCell(null);
      this.RebuildBoundingBox();
      this._isDirty = true;
    }
  }

  /**
   * Carbon IsDirty (cpp:187-206): the cell or any of its statics.
   *
   * @implemented
   * @returns {boolean} Whether anything changed since the flag was reset.
   */
  IsDirty()
  {
    if (this._isDirty) return true;
    for (const interiorStatic of this.statics) if (interiorStatic.IsDirty()) return true;
    return false;
  }

  /**
   * Carbon ResetDirtyFlag (cpp:212-220): the cell's and its statics'.
   *
   * @implemented
   * @returns {void}
   */
  ResetDirtyFlag()
  {
    this._isDirty = false;
    for (const interiorStatic of this.statics) interiorStatic.ResetDirtyFlag();
  }

  /**
   * Carbon GetBoundingBox (cpp:223-229), "Deprecated" in its header.
   *
   * @implemented
   * @param {vec3} minBounds Receives the minimum corner.
   * @param {vec3} maxBounds Receives the maximum corner.
   * @returns {boolean} Whether the box is ready.
   */
  GetBoundingBox(minBounds, maxBounds)
  {
    vec3.copy(minBounds, this.minBounds);
    vec3.copy(maxBounds, this.maxBounds);
    return this._boundingBoxReady;
  }

  /**
   * Carbon UpdateBoundingBox() (cpp:232-238): rebuilds the box until it is ready.
   *
   * @implemented
   * @returns {void}
   */
  UpdateBoundingBox()
  {
    if (!this._boundingBoxReady) this.RebuildBoundingBox();
  }

  /**
   * Carbon UpdateBoundingBox( minBounds, maxBounds ) (cpp:344-351): grows the
   * box to enclose another, which makes it ready.
   *
   * @implemented
   * @param {vec3} minBounds The other box's minimum corner.
   * @param {vec3} maxBounds The other box's maximum corner.
   * @returns {void}
   */
  UpdateBoundingBox__Bounds(minBounds, maxBounds)
  {
    vec3.min(this.minBounds, this.minBounds, minBounds);
    vec3.max(this.maxBounds, this.maxBounds, maxBounds);
    this._boundingBoxReady = true;
  }

  /**
   * Carbon IsBoundingBoxReady (cpp:241-244).
   *
   * @implemented
   * @returns {boolean} Whether the box is ready.
   */
  IsBoundingBoxReady()
  {
    return this._boundingBoxReady;
  }

  /**
   * Carbon IsUnbounded (cpp:247-250).
   *
   * @implemented
   * @returns {boolean} `isUnbounded`.
   */
  IsUnbounded()
  {
    return this.isUnbounded;
  }

  /**
   * Carbon GetName (h).
   *
   * @implemented
   * @returns {string} The cell's name.
   */
  GetName()
  {
    return this.name;
  }

  /**
   * Carbon HasSHProbes (cpp:252-255).
   *
   * @implemented
   * @returns {boolean} Whether a probe resource is loaded and good; never, as none loads.
   */
  HasSHProbes()
  {
    return this.shProbeResource !== null && this.shProbeResource.IsGood();
  }

  /**
   * Carbon GetSHProbe (cpp:257-310): the probes' SH matrices at a position.
   *
   * @notImplemented Tr2SHProbeRes is not ported.
   * @param {vec3} _position The position.
   * @returns {never} Throws.
   */
  GetSHProbe(_position)
  {
    throw new Error("Tr2InteriorCell.GetSHProbe is not implemented: Tr2SHProbeRes is not ported.");
  }

  /**
   * Carbon Update (cpp:313-323): the statics' curve sets, then the cell's three
   * maps, registered again in its store.
   *
   * @implemented
   * @param {number} time Blue time in ticks.
   * @returns {void}
   */
  Update(time)
  {
    for (const interiorStatic of this.statics) interiorStatic.Update(time);
    this.variableStore.RegisterVariableInternal("ReflectionMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.reflectionMap);
    this.variableStore.RegisterVariableInternal("IrradianceMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.irradianceTexture);
    this.variableStore.RegisterVariableInternal("DirectionalIrradianceMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.directionalIrradianceTexture);
  }

  /**
   * Carbon GetReflectionMap (cpp:326-329).
   *
   * @implemented
   * @returns {object|null} The reflection map.
   */
  GetReflectionMap()
  {
    return this.reflectionMap;
  }

  /**
   * Carbon RebuildInternalData (cpp:332-335): "notify this cell that its
   * content has changed".
   *
   * @implemented
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  RebuildInternalData()
  {
    this.RebuildBoundingBox();
  }

  /**
   * Carbon AddDynamic (cpp:365-398): keeps a dynamic touching the cell, and a
   * skinned object in its own list too.
   *
   * @implemented
   * @param {object|null} dynamic The ITr2InteriorDynamic.
   * @returns {boolean} Whether it was added.
   */
  AddDynamic(dynamic)
  {
    if (!dynamic)
    {
      CcpLog.CCP_LOGERR("Attempt to add a NULL dynamic to interior cell!");
      return false;
    }
    let added = false;
    if (!this._dynamics.includes(dynamic))
    {
      this._dynamics.push(dynamic);
      added = true;
    }
    if (CjsSchema.cast(dynamic, Tr2IntSkinnedObject) && !this._skinnedObjects.includes(dynamic)) this._skinnedObjects.push(dynamic);
    this.MarkShadowsDirtyForDynamic(dynamic);
    return added;
  }

  /**
   * Carbon RemoveDynamic (cpp:408-438).
   *
   * @implemented
   * @param {object|null} dynamic The ITr2InteriorDynamic.
   * @returns {boolean} Whether it was removed.
   */
  RemoveDynamic(dynamic)
  {
    if (!dynamic)
    {
      CcpLog.CCP_LOGERR("Attempt to remove NULL dynamic from interior cell!");
      return false;
    }
    const index = this._dynamics.indexOf(dynamic);
    if (index === -1) return false;
    this.MarkShadowsDirtyForDynamic(dynamic);
    this._dynamics.splice(index, 1);
    const skinned = this._skinnedObjects.indexOf(dynamic);
    if (skinned !== -1) this._skinnedObjects.splice(skinned, 1);
    return true;
  }

  /**
   * Carbon AddLight (cpp:448-469).
   *
   * @implemented
   * @param {object|null} light The ITr2InteriorLight.
   * @returns {boolean} Whether it was added.
   */
  AddLight(light)
  {
    if (!light)
    {
      CcpLog.CCP_LOGERR("Attempt to add NULL light source to interior cell!");
      return false;
    }
    if (this._lights.includes(light)) return false;
    this._lights.push(light);
    return true;
  }

  /**
   * Carbon RemoveLight (cpp:478-492).
   *
   * @implemented
   * @param {object|null} light The ITr2InteriorLight.
   * @returns {void}
   */
  RemoveLight(light)
  {
    if (!light)
    {
      CcpLog.CCP_LOGERR("Attempt to remove NULL light from interior cell!");
      return;
    }
    const index = this._lights.indexOf(light);
    if (index !== -1) this._lights.splice(index, 1);
  }

  /**
   * Carbon MarkShadowsDirtyForDynamic (cpp:500-502): empty in Carbon.
   *
   * @implemented
   * @param {object} _dynamic The dynamic.
   * @returns {void}
   */
  MarkShadowsDirtyForDynamic(_dynamic)
  {
  }

  /**
   * Carbon MarkShadowsDirtyForSkinnedObjects (cpp:509-516).
   *
   * @implemented
   * @returns {void}
   */
  MarkShadowsDirtyForSkinnedObjects()
  {
    for (const dynamic of this._skinnedObjects) this.MarkShadowsDirtyForDynamic(dynamic);
  }

  /**
   * Carbon RenderDebugInfo (cpp:519-526): the box, when `drawBoundingBox` is on.
   *
   * @implemented
   * @param {object} lines The TriLineSet.
   * @returns {void}
   */
  RenderDebugInfo(lines)
  {
    if (this.drawBoundingBox) lines.AddBox(this.minBounds, this.maxBounds, 0x800000ff);
  }

  /**
   * Carbon SetSHScale (cpp:529-532).
   *
   * @implemented
   * @param {number} scale The probe spheres' brightness.
   * @returns {void}
   */
  SetSHScale(scale)
  {
    this._shScale = scale;
  }

  /**
   * Carbon SetSHProbeResource (cpp:535-546): the probe resource for `shProbeResPath`.
   *
   * @adapted Tr2SHProbeRes (`.shp`) is not ported, so nothing loads and
   *   `shProbeResource` stays null; the path is kept.
   * @returns {void}
   */
  SetSHProbeResource()
  {
    this.shProbeResource = null;
  }

  /**
   * Carbon IsVolumeReady (cpp:549-552).
   *
   * @implemented
   * @returns {boolean} Whether the box is ready.
   */
  IsVolumeReady()
  {
    return this._boundingBoxReady;
  }

  /**
   * Carbon RebuildBoundingBox (cpp:555-577): the union of the statics' boxes
   * through their transforms; ready once one static has a box.
   *
   * @implemented
   * @returns {void}
   */
  RebuildBoundingBox()
  {
    vec3.set(this.minBounds, FLT_MAX, FLT_MAX, FLT_MAX);
    vec3.set(this.maxBounds, -FLT_MAX, -FLT_MAX, -FLT_MAX);
    this._boundingBoxReady = false;

    // vec3_0 and vec3_1: each static's box minimum and maximum.
    const { vec3_0, vec3_1 } = Tr2InteriorCell.scratch;
    for (const interiorStatic of this.statics)
    {
      if (!interiorStatic.GetBoundingBox(vec3_0, vec3_1)) continue;
      Tr2InteriorStatic._TransformBox(vec3_0, vec3_1, interiorStatic.GetTransform());
      vec3.min(this.minBounds, this.minBounds, vec3_0);
      vec3.max(this.maxBounds, this.maxBounds, vec3_1);
      this._boundingBoxReady = true;
    }
  }

  /**
   * Carbon AddStatic (cpp:588-601): the static goes into `statics`, whose
   * notification makes it join the cell.
   *
   * @implemented
   * @param {Tr2InteriorStatic|null} interiorStatic The static.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  AddStatic(interiorStatic)
  {
    if (!interiorStatic)
    {
      CcpLog.CCP_LOGERR("Attempt to add a NULL static object to interior cell!");
      return;
    }
    this.statics.Insert(-1, interiorStatic);
  }

  /**
   * Carbon RemoveStatic (cpp:610-633).
   *
   * @implemented
   * @param {Tr2InteriorStatic|null} interiorStatic The static.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  RemoveStatic(interiorStatic)
  {
    if (!interiorStatic)
    {
      CcpLog.CCP_LOGERR("Attempt to remove a NULL static object from interior cell!");
      return;
    }
    const index = this.statics.FindKey(interiorStatic);
    if (index === -1)
    {
      CcpLog.CCP_LOGERR(`Tr2InteriorCell::RemoveStatic() - interiorStatic ${interiorStatic.name} not found in this system ${this.name}!`);
      return;
    }
    this.statics.Remove(index);
  }

  /**
   * Carbon ClearStatics (cpp:636-652): every static leaves, the list empties,
   * and the box rebuilds.
   *
   * @implemented
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  ClearStatics()
  {
    for (const interiorStatic of this.statics) interiorStatic.RemoveFromCell();
    while (this.statics.length) this.statics.Remove(0);
    this.RebuildBoundingBox();
    this._isDirty = true;
  }

  /**
   * Carbon ContainsPoint (cpp:660-676).
   *
   * @notImplemented its callers, the lights' and dynamics' cell membership
   *   tests, are not ported; current Carbon's interior scene has no cells.
   * @returns {never} Throws.
   */
  ContainsPoint()
  {
    throw new Error("Tr2InteriorCell.ContainsPoint is not implemented: cell membership tests are not ported.");
  }

  /**
   * Carbon IntersectsOBB (cpp:684-705).
   *
   * @notImplemented as ContainsPoint.
   * @returns {never} Throws.
   */
  IntersectsOBB()
  {
    throw new Error("Tr2InteriorCell.IntersectsOBB is not implemented: cell membership tests are not ported.");
  }

  /**
   * Carbon IntersectsAABB (cpp:713-729).
   *
   * @notImplemented as ContainsPoint.
   * @returns {never} Throws.
   */
  IntersectsAABB()
  {
    throw new Error("Tr2InteriorCell.IntersectsAABB is not implemented: cell membership tests are not ported.");
  }

  /**
   * Carbon IntersectsSphere (cpp:739-755).
   *
   * @notImplemented as ContainsPoint.
   * @returns {never} Throws.
   */
  IntersectsSphere()
  {
    throw new Error("Tr2InteriorCell.IntersectsSphere is not implemented: cell membership tests are not ported.");
  }

  /**
   * Carbon SetVisualizeMethod (cpp:757-763): passed to every static.
   *
   * @implemented
   * @param {number} method A VisualizeMethod.
   * @returns {void}
   */
  SetVisualizeMethod(method)
  {
    for (const interiorStatic of this.statics) interiorStatic.SetVisualizeMethod(method);
  }

  /**
   * Carbon GetVariableStore (h): the cell's own store.
   *
   * @implemented
   * @returns {Tr2VariableStore} The store.
   */
  GetVariableStore()
  {
    return this.variableStore;
  }

  /**
   * Carbon's destructor (cpp:41-56): every static leaves, and the light and
   * dynamic lists clear.
   *
   * @adapted JavaScript has no destructor; the scene or owner calls this.
   * @returns {void}
   * Carbon: ~Tr2InteriorCell (Trinity 24d033fa~1, Interior/Tr2InteriorCell.cpp:41-56).
   * @adapted Explicitly detaches statics and clears the existing owned collections in JavaScript.
   */
  _Destructor()
  {
    for (const interiorStatic of this.statics) interiorStatic.SetParentCell(null);
    this._lights.length = 0;
    this._dynamics.length = 0;
    this._skinnedObjects.length = 0;
  }

}

CjsSchema.be.interface()(Tr2InteriorCell, { kind: "class" });
