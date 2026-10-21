import { IRoot } from "../../../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodThresholdParameter.h
import { IsMatch, INotify } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodThresholdParameter (eve/child/procedural/selection) - generated from schema shapeHash e31926d9.... */
@be.define("EveProceduralMethodThresholdParameter")
@blue.inherit(INotify, IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class EveProceduralMethodThresholdParameter extends IRoot
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

  /** m_threshold (float) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  threshold = 1;

  /** Carbon EveProceduralMethodThresholdParameter::Initialize (cpp:16-23):
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
   * Carbon EveProceduralMethodThresholdParameter::OnModified (cpp:25-42): a
   * threshold change clamps to >= 0 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck.
   */

  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "threshold"))
    {
      this.threshold = Math.max(this.threshold, 0);
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

  /** Carbon method SetModified (cpp:44-47). */

  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:49-52). */

  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetThreshold (cpp:54-57). */

  @meta.implemented
  GetThreshold()
  {
    return this.threshold;
  }

  /** Carbon method GetChild (cpp:59-62). */

  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodThresholdParameter::Load (cpp:64-70): one-line
   * bypass-blocker reload delegate. */

  @meta.implemented
  Load()
  {
    this.child?.Reload(true);
  }

}
