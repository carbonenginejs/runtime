import { exposure as be } from "#be";
import { IBluePlacementObserver } from "#blue/IBluePlacementObserver";
import { ITr2Interior } from "./ITr2Interior.js";
import { ITr2InteriorDynamic } from "./ITr2InteriorDynamic.js";
import { ITr2Pickable } from "../../../trinity/core/ITr2Pickable.js";
import { ITr2BoundingBox } from "#interfaces/ITr2BoundingBox";
// Source: trinity/trinity/Interior/Tr2IntSkinnedObject.h
import { meta, type, blue } from "#schema";
import { IInitialize, INotify } from "#blue";
import { Tr2SkinnedObject } from "../trinityCore/Tr2SkinnedObject.js";

/**
 * Interior skinned-object specialization carrying bounds, depth, and
 * variable-store metadata.
 */
@be.define("Tr2IntSkinnedObject")
@blue.inherit(IInitialize, INotify, ITr2InteriorDynamic, ITr2Pickable, ITr2BoundingBox, IBluePlacementObserver)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(ITr2Interior)
@be.mapInterface(ITr2InteriorDynamic)
@be.mapInterface(ITr2Pickable)
@be.mapInterface(ITr2BoundingBox)
@be.mapInterface(IBluePlacementObserver)
@be.exposureChainTo(Tr2SkinnedObject)
export class Tr2IntSkinnedObject extends Tr2SkinnedObject
{

  /** m_boundingSphere[3] (float) [READ] */
  @be.mapAttribute(be.READ)
  @type.float32
  boundingSphereRadius = 0;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.rootRef("Tr2VariableStore")
  variableStore = null;

  /**
   * Carbon IInitialize hook populates the owner's LOD proxies.
   *
   * Adapted: JS exposes the native protected LOD member as lod; the owner model accessors
   * alias its proxy storage.
   */

  @meta.adapted
  Initialize()
  {
    this.lod.PopulateLods();
    return true;
  }

  /**
   * Carbon INotify hook delegates to Tr2SkinnedObject and accepts all changes.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    super.OnModified(propertyName);
    this.lod.OnModified(propertyName);
    return true;
  }

  /** Carbon override delegates LOD selection to Tr2SkinnedObject. */

  @meta.implemented
  SetLOD(frustum)
  {
    return super.SetLOD(frustum);
  }

}

// Interior rendering, picking and placement contracts remain outside the maintained CPU LOD port.
