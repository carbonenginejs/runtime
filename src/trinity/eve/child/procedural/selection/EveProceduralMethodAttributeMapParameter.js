import { IRoot } from "../../../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodAttributeMapParameter.h
import { IsMatch, INotify } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodAttributeMapParameter (eve/child/procedural/selection) - generated from schema shapeHash 5880f54c.... */
@be.define("EveProceduralMethodAttributeMapParameter")
@blue.inherit(INotify, IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class EveProceduralMethodAttributeMapParameter extends IRoot
{

  _modified = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.object.ref("EveChildRef")
  child = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** Carbon EveProceduralMethodAttributeMapParameter::Initialize (cpp:15-22):
   * lazily create the child ref. */

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
   * Carbon EveProceduralMethodAttributeMapParameter::OnModified (cpp:24-35):
   * a child assignment blocks its auto-load until the map selects it. The
   * value argument follows the repo's OnModified duck.
   */

  @meta.implemented
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

  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:42-45). */

  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetName (cpp:47-50). */

  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetChild (cpp:52-55). */

  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodAttributeMapParameter::Load (cpp:57-63):
   * one-line bypass-blocker reload delegate. */

  @meta.implemented
  Load()
  {
    this.child?.Reload(true);
  }

}
