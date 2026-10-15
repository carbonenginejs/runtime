// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodThresholdParameter.h
import { IsMatch } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodThresholdParameter (eve/child/procedural/selection) - generated from schema shapeHash e31926d9.... */
@blue.define("EveProceduralMethodThresholdParameter")
@blue.inherit(IInitialize)
@blue.interface(IInitialize)
export class EveProceduralMethodThresholdParameter
{

  _modified = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveChildRef")
  child = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_threshold (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  threshold = 1;

  /** Carbon EveProceduralMethodThresholdParameter::Initialize (cpp:16-23):
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
   * Carbon EveProceduralMethodThresholdParameter::OnModified (cpp:25-42): a
   * threshold change clamps to >= 0 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck.
   */
  @blue.method
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
  @blue.method
  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:49-52). */
  @blue.method
  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetThreshold (cpp:54-57). */
  @blue.method
  @meta.implemented
  GetThreshold()
  {
    return this.threshold;
  }

  /** Carbon method GetChild (cpp:59-62). */
  @blue.method
  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodThresholdParameter::Load (cpp:64-70): one-line
   * bypass-blocker reload delegate. */
  @blue.method
  @meta.implemented
  Load()
  {
    this.child?.Reload(true);
  }

}
