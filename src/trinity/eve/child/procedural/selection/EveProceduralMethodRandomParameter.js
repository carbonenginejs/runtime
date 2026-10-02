import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodRandomParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodRandomParameter (eve/child/procedural/selection) - generated from schema shapeHash 8b32e583.... */
@meta.define({ className: "EveProceduralMethodRandomParameter", family: "eve/child/procedural/selection" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveProceduralMethodRandomParameter
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

  /** m_weighting (int) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  weighting = 1;

  /** Carbon EveProceduralMethodRandomParameter::Initialize (cpp:26-33):
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

  /** Carbon EveProceduralMethodRandomParameter::OnModified (cpp:35-52): a
   * weighting change clamps to >= 1 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The Be::Var notification identity is represented by either the field name or assigned value.")
  OnModified(value = null)
  {
    if (value === "weighting")
    {
      this.weighting = Math.max(this.weighting, 1);
      this._modified = true;
    }

    if (value === "child")
    {
      if (this.child)
      {
        this.child.SetAutoLoadBlocker(true);
      }
    }

    return true;
  }

  /** Carbon method GetName (cpp:16-19). */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method SetName (cpp:21-24). */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method SetModified (cpp:54-57). */
  @meta.blue.method
  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:59-62). */
  @meta.blue.method
  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetWeighting (cpp:64-67). */
  @meta.blue.method
  @meta.implemented
  GetWeighting()
  {
    return this.weighting;
  }

  /** Carbon method GetChild (cpp:69-72). */
  @meta.blue.method
  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodRandomParameter::Load (cpp:74-80): one-line
   * bypass-blocker reload delegate. */
  @meta.blue.method
  @meta.implemented
  Load()
  {
    this.child?.Reload?.(true);
  }

}
