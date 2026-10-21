import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodCyclingParameter.h
import { IsMatch, INotify } from "#blue";
import { IInitialize } from "../../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodCyclingParameter (eve/child/procedural/selection) - generated from schema shapeHash 90bcbbe1.... */
@be.define("EveProceduralMethodCyclingParameter")
@blue.inherit(INotify, IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class EveProceduralMethodCyclingParameter
{

  _modified = false;

  // Carbon m_hasLoaded: runtime-only load latch (never persisted).
  _hasLoaded = false;

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

  /** m_playDuration (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  playDuration = 1;

  /** m_reloadRequired (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  reloadRequired = false;

  /** m_restartRequired (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  restartRequired = true;

  /** Carbon EveProceduralMethodCyclingParameter::Initialize (cpp:19-26):
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
   * Carbon EveProceduralMethodCyclingParameter::OnModified (cpp:28-39): a
   * child assignment blocks its auto-load until the cycle selects it. The
   * value argument follows the repo's OnModified duck.
   */
  @blue.method
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

  /** Carbon method SetModified (cpp:41-44). */
  @blue.method
  @meta.implemented
  SetModified(isModified)
  {
    this._modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:46-49). */
  @blue.method
  @meta.implemented
  IsModified()
  {
    return this._modified;
  }

  /** Carbon method GetName (cpp:51-54). */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetChild (cpp:56-59). */
  @blue.method
  @meta.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon method GetDuration (cpp:61-64). */
  @blue.method
  @meta.implemented
  GetDuration()
  {
    return this.playDuration;
  }

  /** Carbon EveProceduralMethodCyclingParameter::Load (cpp:66-83): an
   * already-loaded parameter that needs no reload only restarts its
   * controllers/curve sets when required; otherwise the child ref reloads
   * with the auto-load blocker bypassed. */
  @blue.method
  @meta.implemented
  Load()
  {
    if (this._hasLoaded && !this.reloadRequired)
    {
      if (this.restartRequired)
      {
        this.child.StartControllers();
        this.child.PlayAllCurveSets();
      }
      return;
    }

    if (this.child)
    {
      this.child.Reload(true);
      this._hasLoaded = true;
    }
  }

}
