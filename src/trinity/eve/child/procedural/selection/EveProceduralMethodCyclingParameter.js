import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodCyclingParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodCyclingParameter (eve/child/procedural/selection) - generated from schema shapeHash 90bcbbe1.... */
@meta.define({ className: "EveProceduralMethodCyclingParameter", family: "eve/child/procedural/selection" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveProceduralMethodCyclingParameter
{

  _modified = false;

  // Carbon m_hasLoaded: runtime-only load latch (never persisted).
  _hasLoaded = false;

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

  /** m_playDuration (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  playDuration = 1;

  /** m_reloadRequired (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  reloadRequired = false;

  /** m_restartRequired (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  restartRequired = true;

  /** Carbon EveProceduralMethodCyclingParameter::Initialize (cpp:19-26):
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

  /** Carbon EveProceduralMethodCyclingParameter::OnModified (cpp:28-39): a
   * child assignment blocks its auto-load until the cycle selects it. The
   * value argument follows the repo's OnModified duck. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The Be::Var notification identity is represented by either the field name or assigned value.")
  OnModified(value = null)
  {
    if (value === "child")
    {
      if (this.child)
      {
        this.child.SetAutoLoadBlocker(true);
      }
    }

    return true;
  }

  /** Carbon method SetModified (cpp:41-44). */
  @meta.blue.method
  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:46-49). */
  @meta.blue.method
  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetName (cpp:51-54). */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetChild (cpp:56-59). */
  @meta.blue.method
  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon method GetDuration (cpp:61-64). */
  @meta.blue.method
  @meta.implemented
  GetDuration()
  {
    return this.playDuration;
  }

  /** Carbon EveProceduralMethodCyclingParameter::Load (cpp:66-83): an
   * already-loaded parameter that needs no reload only restarts its
   * controllers/curve sets when required; otherwise the child ref reloads
   * with the auto-load blocker bypassed. */
  @meta.blue.method
  @meta.implemented
  Load()
  {
    if (this._hasLoaded && !this.reloadRequired)
    {
      if (this.restartRequired)
      {
        this.child?.StartControllers();
        this.child?.PlayAllCurveSets?.();
      }
      return;
    }

    if (this.child)
    {
      this.child.Reload?.(true);
      this._hasLoaded = true;
    }
  }

}
