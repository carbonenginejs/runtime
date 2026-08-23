// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataPatternTransform } from "./EveSOFDataPatternTransform.js";

/** EveSOFDataPatternPerHull (eve) - generated from schema shapeHash ba16415a.... */
@type.define({ className: "EveSOFDataPatternPerHull", family: "eve" })
export class EveSOFDataPatternPerHull extends CjsModel
{

  /** m_transformLayer1 (EveSOFDataPatternTransformPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataPatternTransform")
  transformLayer1 = null;

  /** m_transformLayer2 (EveSOFDataPatternTransformPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataPatternTransform")
  transformLayer2 = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /**
   * Creates a per-hull pattern transform pair identified by the supplied hull
   * name.
   */
  constructor(name = "")
  {
    super();
    this.name = name;
  }

  /**
   * Clears each present layer transform while preserving the transform objects
   * for reuse.
   */
  Empty()
  {
    if (this.transformLayer1) this.transformLayer1.Empty();
    if (this.transformLayer2) this.transformLayer2.Empty();
    return this;
  }

  /** Swaps the first and second layer transform references in place. */
  Flip()
  {
    [this.transformLayer1, this.transformLayer2] = [this.transformLayer2, this.transformLayer1];
    return this;
  }

  /** Routes the two custom masks into their matching per-hull transform layers. */
  SetFromCustomMasks(customMask1, customMask2)
  {
    this.SetTransformLayer1FromCustomMask(customMask1);
    this.SetTransformLayer2FromCustomMask(customMask2);
    return this;
  }

  /**
   * Clears the first transform for a null mask, otherwise creating or reusing it
   * from that mask.
   */
  SetTransformLayer1FromCustomMask(customMask)
  {
    this.transformLayer1 = setTransformFromCustomMask(this.transformLayer1, customMask);
    return this;
  }

  /**
   * Clears the second transform for a null mask, otherwise creating or reusing
   * it from that mask.
   */
  SetTransformLayer2FromCustomMask(customMask)
  {
    this.transformLayer2 = setTransformFromCustomMask(this.transformLayer2, customMask);
    return this;
  }

}

function setTransformFromCustomMask(transform, customMask)
{
  if (!customMask) return null;
  return (transform ?? new EveSOFDataPatternTransform()).SetFromCustomMask(customMask);
}
