import { IsMatch } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodThresholdParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodThresholdParameter (eve/child/procedural/selection) - generated from schema shapeHash e31926d9.... */
@meta.define({ className: "EveProceduralMethodThresholdParameter", family: "eve/child/procedural/selection" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveProceduralMethodThresholdParameter
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

  /** m_threshold (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  threshold = 1;

  /** Carbon EveProceduralMethodThresholdParameter::Initialize (cpp:16-23):
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

  /** Carbon EveProceduralMethodThresholdParameter::OnModified (cpp:25-42): a
   * threshold change clamps to >= 0 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The Be::Var notification identity is represented by either the field name or assigned value.")
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
  @meta.blue.method
  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:49-52). */
  @meta.blue.method
  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetThreshold (cpp:54-57). */
  @meta.blue.method
  @meta.implemented
  GetThreshold()
  {
    return this.threshold;
  }

  /** Carbon method GetChild (cpp:59-62). */
  @meta.blue.method
  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodThresholdParameter::Load (cpp:64-70): one-line
   * bypass-blocker reload delegate. */
  @meta.blue.method
  @meta.implemented
  Load()
  {
    this.child?.Reload?.(true);
  }

}
