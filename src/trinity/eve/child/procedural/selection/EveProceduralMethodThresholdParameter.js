// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodThresholdParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodThresholdParameter (eve/child/procedural/selection) - generated from schema shapeHash e31926d9.... */
@type.define({ className: "EveProceduralMethodThresholdParameter", family: "eve/child/procedural/selection" })
export class EveProceduralMethodThresholdParameter extends CjsModel
{

  #modified = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("EveChild")
  child = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_threshold (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  threshold = 1;

  /** Carbon EveProceduralMethodThresholdParameter::Initialize (cpp:16-23):
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

  /** Carbon EveProceduralMethodThresholdParameter::OnModified (cpp:25-42): a
   * threshold change clamps to >= 0 and flags the parameter modified; a child
   * assignment blocks its auto-load. The value argument follows the repo's
   * OnModified duck. */
  @carbon.method
  @impl.adapted
  @impl.reason("SetAutoLoadBlocker is inlined onto loadChildAutomatically when the staged EveChildRef lacks the method.")
  OnModified(value = null)
  {
    if (value === "threshold" || value === this.threshold)
    {
      this.threshold = Math.max(this.threshold, 0);
      this.#modified = true;
    }

    if (value === "child" || (value && value === this.child))
    {
      if (this.child)
      {
        if (typeof this.child.SetAutoLoadBlocker === "function")
        {
          this.child.SetAutoLoadBlocker(true);
        }
        else
        {
          this.child.loadChildAutomatically = false;
        }
      }
    }

    return true;
  }

  /** Carbon method SetModified (cpp:44-47). */
  @carbon.method
  @impl.implemented
  SetModified(isModified)
  {
    this.#modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:49-52). */
  @carbon.method
  @impl.implemented
  IsModified()
  {
    return this.#modified;
  }

  /** Carbon method GetThreshold (cpp:54-57). */
  @carbon.method
  @impl.implemented
  GetThreshold()
  {
    return this.threshold;
  }

  /** Carbon method GetChild (cpp:59-62). */
  @carbon.method
  @impl.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodThresholdParameter::Load (cpp:64-70): one-line
   * bypass-blocker reload delegate. */
  @carbon.method
  @impl.implemented
  Load()
  {
    this.child?.Reload?.(true);
  }

}
