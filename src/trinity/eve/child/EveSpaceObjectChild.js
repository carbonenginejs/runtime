import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveSpaceObjectChild.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveSpaceObjectChild.cpp
import { meta, type, blue } from "#schema";
import { Origin } from "../../generated/eve/child/enums.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";

/**
 * Appends one batch type's areas of a mesh to the shared area pool as plain
 * {index, count, alphaCutout, reversed} records (Carbon free function
 * EveCollectAreas, EveSpaceObjectChild.cpp:157-181; the EveChildGeometryArea
 * POD is EveSpaceObjectChild.h:31-37).
 *
 * @param {Number} type - a TriBatchType
 * @param {Tr2MeshBase|null} mesh - mesh supplying GetAreas(type)
 * @param {Array} areaPool - the pool records are appended to
 */
export function EveCollectAreas(type, mesh, areaPool)
{
  const areas = mesh?.GetAreas(type);
  if (!areas) return;
  for (const area of areas)
  {
    areaPool.push({
      index: Number(area.GetIndex()) >>> 0,
      count: Number(area.GetCount()) >>> 0,
      alphaCutout: !!area.IsAlphaCutout(),
      reversed: !!area.IsReversed()
    });
  }
}


/**
 * Nominal base for every live space-object child.
 *
 * Carbon supplies real no-op defaults for the optional child capabilities;
 * owner, parent and part-tag state remain concrete shared behavior.
 *
 * The donor also declares EveChildLocatorSetsSource, EveChildGeometryArea and
 * EveChildGeometry (EveSpaceObjectChild.h:17-50). Their current JavaScript
 * producers in EveChildMesh, EveChildInstancedMeshes and EveCollectAreas emit
 * plain records; no nominal class declarations exist for those three structs.
 */
@blue.define({ className: "EveSpaceObjectChild", abstract: true })
@blue.interface()
export class EveSpaceObjectChild extends IEveSpaceObjectChild
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @blue.read
  @type.uint32
  partTag = 0;

  _owner = null;

  _parent = null;

  /** Returns the authored child name. */
  @blue.method
  GetName()
  {
    return this.name;
  }

  /** Sets the authored child name. */
  @blue.method
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Provides the Carbon default no-op visibility update. */
  @blue.method
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** Provides the Carbon default no-op renderable collection. */
  @blue.method
  GetRenderables(_renderables)
  {
  }

  /** Reports that the base child has no bounding sphere. */
  @blue.method
  GetBoundingSphere(_sphere, _query)
  {
    return false;
  }

  /** Provides the Carbon default no-op quad-effect registration. */
  @blue.method
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Provides the Carbon default no-op quad submission. */
  @blue.method
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /** Provides the Carbon default no-op synchronous update. */
  @blue.method
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /** Provides the Carbon default no-op asynchronous update. */
  @blue.method
  UpdateAsyncronous(_updateContext, _params)
  {
  }

  /** Provides the Carbon default no-op local-to-world query. */
  @blue.method
  GetLocalToWorldTransform(_transform)
  {
  }

  /** Reports that the base child is not forced visible. */
  @blue.method
  IsAlwaysOn()
  {
    return false;
  }

  /** Provides the Carbon default no-op child setup. */
  @blue.method
  Setup(_scale, _rotation, _translation, _lowestLodVisible)
  {
  }

  /** Provides the Carbon default no-op LOD change. */
  @blue.method
  ChangeLOD(_lod)
  {
  }

  /** Provides the Carbon default no-op controller-variable update. */
  @blue.method
  SetControllerVariable(_name, _value)
  {
  }

  /** Provides the Carbon default no-op controller-event handler. */
  @blue.method
  HandleControllerEvent(_name)
  {
  }

  /** Provides the Carbon default no-op controller start. */
  @blue.method
  StartControllers()
  {
  }

  /** Provides the Carbon default no-op procedural-variable update. */
  @blue.method
  SetProceduralContainerVariable(_name, _value)
  {
  }

  /** Provides the Carbon default no-op shader-option update. */
  @blue.method
  SetShaderOption(_name, _value)
  {
  }

  /** Provides the Carbon default no-op origin update. */
  @blue.method
  SetOrigin(_origin)
  {
  }

  /** Provides the Carbon default no-op transform-modifier attachment. */
  @blue.method
  AddTransformModifier(_modifier)
  {
  }

  /** Provides the Carbon default no-op mute update. */
  @blue.method
  SetMute(_isMuted)
  {
  }

  /** Returns the child part tag. */
  @blue.method
  GetPartTag()
  {
    return this.partTag;
  }

  /** Sets the child part tag as an unsigned 32-bit value. */
  @blue.method
  SetPartTag(tag)
  {
    this.partTag = Number(tag) >>> 0;
  }

  /** Returns the owning space object. */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetOwner()
  {
    return this._owner;
  }

  /** Sets the owning space object. */
  @blue.method
  SetOwner(owner)
  {
    this._owner = owner ?? null;
  }

  /** Returns the parent child node. */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetParent()
  {
    return this._parent;
  }

  /** Sets the parent child node. */
  @blue.method
  SetParent(parent)
  {
    this._parent = parent ?? null;
  }

  /** Provides the Carbon default no-op locator-set collection. */
  @blue.method
  CollectOwnedLocatorSets(_parentTransform, _out)
  {
  }

  /**
   * Provides the Carbon default no-op geometry collection
   * (EveSpaceObjectChild.h:284-291): records land in `out` as
   * {geometry, childToObject, areaStart, areaCount} and their areas in the
   * shared `areaPool`.
   */
  @blue.method
  CollectOwnedGeometry(_type, _parentTransform, _out, _areaPool)
  {
  }

  /**
   * Returns the damage overlay of one part of this child, or null while the
   * part has none (Carbon EveSpaceObjectChild.cpp:138-141 base default).
   */
  @blue.method
  @meta.implemented
  GetPartDamageOverlay(_partTag)
  {
    return null;
  }

  /** Creates the damage overlay of one part (Carbon cpp:143-145 base no-op). */
  @blue.method
  @meta.implemented
  CreatePartDamageOverlay(_partTag)
  {
  }

  /**
   * Returns the armour damage shader of one part, or null when the child has
   * none (Carbon cpp:147-150 base default).
   */
  @blue.method
  @meta.implemented
  GetPartArmorDamageShaderEffect(_partTag)
  {
    return null;
  }

  /**
   * Writes the animated child-local pose of one of a part's damage locators;
   * the base child owns none, so nothing is written (Carbon cpp:152-155).
   */
  @blue.method
  @meta.implemented
  GetPartDamageLocatorAnimatedLocal(_partTag, _index, _position, _direction)
  {
    return false;
  }

  /** Attaches one child and propagates owner and nonzero part-tag state. */
  @blue.method
  RegisterChild(child)
  {
    if (child === null || child === undefined)
    {
      return;
    }

    child.SetParent(this);
    child.SetOwner(this._owner);

    if (this.partTag !== EveSpaceObjectChild.NO_PART_TAG)
    {
      child.SetPartTag(this.partTag);
    }
  }

  /** Detaches one child while retaining its part tag. */
  @blue.method
  UnregisterChild(child)
  {
    if (child === null || child === undefined)
    {
      return;
    }

    const parent = child.GetParent();
    if (parent !== this && parent !== null)
    {
      throw new Error("Cannot unregister a space-object child owned by another parent.");
    }

    child.SetParent(null);
    child.SetOwner(null);
  }

  /** Attaches every child in an iterable. */
  @blue.method
  RegisterChildren(children)
  {
    for (const child of children)
    {
      this.RegisterChild(child);
    }
  }

  /** Detaches every child in an iterable. */
  @blue.method
  UnregisterChildren(children)
  {
    for (const child of children)
    {
      this.UnregisterChild(child);
    }
  }

  static Origin = Origin;

  static NO_PART_TAG = 0;

}

// EveSpaceObjectChild_Blue.cpp: native exposure.
