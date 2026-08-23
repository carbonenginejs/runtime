// Ported from CarbonEngine Trinity Eve/SpaceObject/Children/EveSpaceObjectChild.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Origin } from "../../generated/eve/child/enums.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";


/**
 * Nominal base for every live space-object child.
 *
 * Carbon supplies real no-op defaults for the optional child capabilities;
 * owner, parent and part-tag state remain concrete shared behavior.
 */
@type.define({ className: "EveSpaceObjectChild", family: "eve/child" })
export class EveSpaceObjectChild extends IEveSpaceObjectChild
{
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.uint32
  partTag = 0;

  #owner = null;

  #parent = null;

  /** Returns the authored child name. */
  GetName()
  {
    return this.name;
  }

  /** Sets the authored child name. */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Provides the Carbon default no-op visibility update. */
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** Provides the Carbon default no-op renderable collection. */
  GetRenderables(_renderables)
  {
  }

  /** Reports that the base child has no bounding sphere. */
  GetBoundingSphere(_sphere, _query)
  {
    return false;
  }

  /** Provides the Carbon default no-op quad-effect registration. */
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Provides the Carbon default no-op quad submission. */
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /** Provides the Carbon default no-op synchronous update. */
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /** Provides the Carbon default no-op asynchronous update. */
  UpdateAsyncronous(_updateContext, _params)
  {
  }

  /** Provides the Carbon default no-op local-to-world query. */
  GetLocalToWorldTransform(_transform)
  {
  }

  /** Reports that the base child is not forced visible. */
  IsAlwaysOn()
  {
    return false;
  }

  /** Provides the Carbon default no-op child setup. */
  Setup(_scale, _rotation, _translation, _lowestLodVisible)
  {
  }

  /** Provides the Carbon default no-op LOD change. */
  ChangeLOD(_lod)
  {
  }

  /** Provides the Carbon default no-op controller-variable update. */
  SetControllerVariable(_name, _value)
  {
  }

  /** Provides the Carbon default no-op controller-event handler. */
  HandleControllerEvent(_name)
  {
  }

  /** Provides the Carbon default no-op controller start. */
  StartControllers()
  {
  }

  /** Provides the Carbon default no-op procedural-variable update. */
  SetProceduralContainerVariable(_name, _value)
  {
  }

  /** Provides the Carbon default no-op shader-option update. */
  SetShaderOption(_name, _value)
  {
  }

  /** Provides the Carbon default no-op origin update. */
  SetOrigin(_origin)
  {
  }

  /** Provides the Carbon default no-op transform-modifier attachment. */
  AddTransformModifier(_modifier)
  {
  }

  /** Provides the Carbon default no-op mute update. */
  SetMute(_isMuted)
  {
  }

  /** Returns the child part tag. */
  GetPartTag()
  {
    return this.partTag;
  }

  /** Sets the child part tag as an unsigned 32-bit value. */
  SetPartTag(tag)
  {
    this.partTag = Number(tag) >>> 0;
  }

  @carbon.method
  @impl.implemented
  /** Returns the owning space object. */
  GetOwner()
  {
    return this.#owner;
  }

  /** Sets the owning space object. */
  SetOwner(owner)
  {
    this.#owner = owner ?? null;
  }

  @carbon.method
  @impl.implemented
  /** Returns the parent child node. */
  GetParent()
  {
    return this.#parent;
  }

  /** Sets the parent child node. */
  SetParent(parent)
  {
    this.#parent = parent ?? null;
  }

  /** Provides the Carbon default no-op locator-set collection. */
  CollectOwnedLocatorSets(_parentTransform, _out)
  {
  }

  /** Provides the Carbon default no-op geometry collection. */
  CollectOwnedGeometry(_parentTransform, _out)
  {
  }

  /** Attaches one child and propagates owner and nonzero part-tag state. */
  RegisterChild(child)
  {
    if (child === null || child === undefined)
    {
      return;
    }

    child.SetParent(this);
    child.SetOwner(this.#owner);

    if (this.partTag !== EveSpaceObjectChild.NO_PART_TAG)
    {
      child.SetPartTag(this.partTag);
    }
  }

  /** Detaches one child while retaining its part tag. */
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
  RegisterChildren(children)
  {
    for (const child of children)
    {
      this.RegisterChild(child);
    }
  }

  /** Detaches every child in an iterable. */
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
