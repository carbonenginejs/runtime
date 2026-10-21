import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodRandomParameter.h
import { IsMatch, INotify } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodRandomParameter (eve/child/procedural/selection) - generated from schema shapeHash 8b32e583.... */
@be.define("EveProceduralMethodRandomParameter")
@blue.inherit(INotify, IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class EveProceduralMethodRandomParameter
{

  _modified = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.rootRef("EveChildRef")
  child = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_weighting (int) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.int32
  weighting = 1;

  /** Carbon EveProceduralMethodRandomParameter::Initialize (cpp:26-33):
   * lazily create the child ref. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    if (!this.child)
    {
      this.child = new EveChildRef();
    }
    return true;
  }

  /**
   * Carbon EveProceduralMethodRandomParameter::OnModified (cpp:35-52): a
   * weighting change clamps to >= 1 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck.
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "weighting"))
    {
      this.weighting = Math.max(this.weighting, 1);
      this._modified = true;
    }

    if (IsMatch(value, "child"))
    {
      if (this.child)
      {
        this.child.SetAutoLoadBlocker(true);
      }
    }

    return true;
  }

  /** Carbon method GetName (cpp:16-19). */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method SetName (cpp:21-24). */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method SetModified (cpp:54-57). */
  @blue.method
  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:59-62). */
  @blue.method
  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetWeighting (cpp:64-67). */
  @blue.method
  @meta.implemented
  GetWeighting()
  {
    return this.weighting;
  }

  /** Carbon method GetChild (cpp:69-72). */
  @blue.method
  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodRandomParameter::Load (cpp:74-80): one-line
   * bypass-blocker reload delegate. */
  @blue.method
  @meta.implemented
  Load()
  {
    this.child?.Reload(true);
  }

}
