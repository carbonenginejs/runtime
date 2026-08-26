// Source: trinity/trinity/Eve/SpaceObject/Children/ProceduralContainer/SelectionMethods/EveProceduralMethodAttributeMapParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { EveChildRef } from "../../../../eve/child/EveChildRef.js";

/** EveProceduralMethodAttributeMapParameter (eve/child/procedural/selection) - generated from schema shapeHash 5880f54c.... */
@type.define({ className: "EveProceduralMethodAttributeMapParameter", family: "eve/child/procedural/selection" })
export class EveProceduralMethodAttributeMapParameter extends CjsModel
{

  #modified = false;

  /** m_child (EveChildRefPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("EveChildRef")
  child = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** Carbon EveProceduralMethodAttributeMapParameter::Initialize (cpp:15-22):
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

  /** Carbon EveProceduralMethodAttributeMapParameter::OnModified (cpp:24-35):
   * a child assignment blocks its auto-load until the map selects it. The
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

  /** Carbon method SetModified (cpp:37-40). */
  @carbon.method
  @impl.implemented
  SetModified(isModified)
  {
    this.#modified = !!isModified;
  }

  /** Carbon method IsModified (cpp:42-45). */
  @carbon.method
  @impl.implemented
  IsModified()
  {
    return this.#modified;
  }

  /** Carbon method GetName (cpp:47-50). */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetChild (cpp:52-55). */
  @carbon.method
  @impl.implemented
  GetChild()
  {
    return this.child;
  }

  /** Carbon EveProceduralMethodAttributeMapParameter::Load (cpp:57-63):
   * one-line bypass-blocker reload delegate. */
  @carbon.method
  @impl.implemented
  Load()
  {
    this.child?.Reload?.(true);
  }

}
