import { IsMatch } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodAttributeMapParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodAttributeMapParameter (eve/child/procedural/selection) - generated from schema shapeHash 5880f54c.... */
@meta.define({ className: "EveProceduralMethodAttributeMapParameter", family: "eve/child/procedural/selection" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveProceduralMethodAttributeMapParameter
{

  _modified = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("EveChildRef")
  child = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Carbon EveProceduralMethodAttributeMapParameter::Initialize (cpp:15-22):
   * lazily create the child ref. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    if (!this.child)
    {
      this.child = new EveChildRef();
    }
    return true;
  }

  /** Carbon EveProceduralMethodAttributeMapParameter::OnModified (cpp:24-35):
   * a child assignment blocks its auto-load until the map selects it. The
   * value argument follows the repo's OnModified duck. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The Be::Var notification identity is represented by either the field name or assigned value.")
  OnModified(value = null)
  {
    if (IsMatch(value, "child"))
    {
      if (this.child)
      {
        this.child.SetAutoLoadBlocker(true);
      }
    }

    return true;
  }

  /** Carbon method SetModified (cpp:37-40). */
  @meta.blue.method
  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:42-45). */
  @meta.blue.method
  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetName (cpp:47-50). */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetChild (cpp:52-55). */
  @meta.blue.method
  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodAttributeMapParameter::Load (cpp:57-63):
   * one-line bypass-blocker reload delegate. */
  @meta.blue.method
  @meta.implemented
  Load()
  {
    this.child?.Reload?.(true);
  }

}
