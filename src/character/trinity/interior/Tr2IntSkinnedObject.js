// Source: trinity/trinity/Interior/Tr2IntSkinnedObject.h
import { meta } from "#schema";
import { IInitialize, INotify } from "#blue";
import { Tr2SkinnedObject } from "../trinityCore/Tr2SkinnedObject.js";

/**
 * Interior skinned-object specialization carrying bounds, depth, and
 * variable-store metadata.
 */
@meta.define({ className: "Tr2IntSkinnedObject", family: "interior" })
@meta.blue.inherit(IInitialize, INotify)
export class Tr2IntSkinnedObject extends Tr2SkinnedObject
{

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

  /** Carbon IInitialize hook populates the owner's LOD proxies. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS exposes the native protected LOD member as lod; the owner model accessors alias its proxy storage.")
  Initialize()
  {
    this.lod.PopulateLods();
    return true;
  }

  /** Carbon INotify hook delegates to Tr2SkinnedObject and accepts all changes. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Exposed owner *DetailModel names map to the native LOD helper proxy members.")
  OnModified(propertyName)
  {
    if (super.OnModified(propertyName)) return true;
    this.lod.OnModified(propertyName);
    return true;
  }

  /** Carbon override delegates LOD selection to Tr2SkinnedObject. */
  @meta.blue.method
  @meta.implemented
  SetLOD(frustum)
  {
    return super.SetLOD(frustum);
  }

}

// Interior rendering, picking and placement contracts remain outside the maintained CPU LOD port.
meta.blue.interfaceTable({ interfaces: [Tr2IntSkinnedObject, IInitialize, INotify], chainTo: Tr2SkinnedObject })(Tr2IntSkinnedObject, { kind: "class" });
