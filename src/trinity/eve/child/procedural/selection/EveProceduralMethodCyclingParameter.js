// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodCyclingParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodCyclingParameter (eve/child/procedural/selection) - generated from schema shapeHash 90bcbbe1.... */
@type.define({ className: "EveProceduralMethodCyclingParameter", family: "eve/child/procedural/selection" })
export class EveProceduralMethodCyclingParameter extends CjsModel
{

  #modified = false;

  // Carbon m_hasLoaded: runtime-only load latch (never persisted).
  #hasLoaded = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("EveChildRef")
  child = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_playDuration (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  playDuration = 1;

  /** m_reloadRequired (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  reloadRequired = false;

  /** m_restartRequired (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  restartRequired = true;

  /** Carbon EveProceduralMethodCyclingParameter::Initialize (cpp:19-26):
   * lazily create the child ref. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  @impl.reason("The Be::Var notification identity is represented by either the field name or assigned value.")
  OnModified(value = null)
  {
    if (value === "child" || (value && value === this.child))
    {
      if (this.child)
      {
        this.child.SetAutoLoadBlocker(true);
      }
    }

    return true;
  }

  /** Carbon method SetModified (cpp:41-44). */
  @carbon.method
  @impl.implemented
  SetModified(isModified)
  {
    this.#modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:46-49). */
  @carbon.method
  @impl.implemented
  IsModified()
  {
    return this.#modified;
  }

  /** Carbon method GetName (cpp:51-54). */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetChild (cpp:56-59). */
  @carbon.method
  @impl.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon method GetDuration (cpp:61-64). */
  @carbon.method
  @impl.implemented
  GetDuration()
  {
    return this.playDuration;
  }

  /** Carbon EveProceduralMethodCyclingParameter::Load (cpp:66-83): an
   * already-loaded parameter that needs no reload only restarts its
   * controllers/curve sets when required; otherwise the child ref reloads
   * with the auto-load blocker bypassed. */
  @carbon.method
  @impl.implemented
  Load()
  {
    if (this.#hasLoaded && !this.reloadRequired)
    {
      if (this.restartRequired)
      {
        this.child?.StartControllers?.();
        this.child?.PlayAllCurveSets?.();
      }
      return;
    }

    if (this.child)
    {
      this.child.Reload?.(true);
      this.#hasLoaded = true;
    }
  }

}
