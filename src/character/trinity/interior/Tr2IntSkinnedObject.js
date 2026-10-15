// Source: trinity/trinity/Interior/Tr2IntSkinnedObject.h
import { meta, type, blue } from "#schema";
import { IInitialize, INotify } from "#blue";
import { Tr2SkinnedObject } from "../trinityCore/Tr2SkinnedObject.js";

/**
 * Interior skinned-object specialization carrying bounds, depth, and
 * variable-store metadata.
 */
@blue.define("Tr2IntSkinnedObject")
@blue.inherit(IInitialize, INotify)
@blue.interface(IInitialize, INotify)
@blue.chainTo(Tr2SkinnedObject)
export class Tr2IntSkinnedObject extends Tr2SkinnedObject
{

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

  /**
   * Carbon IInitialize hook populates the owner's LOD proxies.
   *
   * Adapted: JS exposes the native protected LOD member as lod; the owner model accessors
   * alias its proxy storage.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this.lod.PopulateLods();
    return true;
  }

  /**
   * Carbon INotify hook delegates to Tr2SkinnedObject and accepts all changes.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    super.OnModified(propertyName);
    this.lod.OnModified(propertyName);
    return true;
  }

  /** Carbon override delegates LOD selection to Tr2SkinnedObject. */
  @blue.method
  @meta.implemented
  SetLOD(frustum)
  {
    return super.SetLOD(frustum);
  }

}

// Interior rendering, picking and placement contracts remain outside the maintained CPU LOD port.
