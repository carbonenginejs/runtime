// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataBlinkType (eve) - generated from schema shapeHash db502493.... */
@type.define({ className: "EveSOFDataBlinkType", family: "eve" })
export class EveSOFDataBlinkType extends CjsModel
{

  /** m_blinkType[TYPE_BLINK] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBlink")
  Blink = null;

  /** m_blinkType[TYPE_FADE_IN] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBlink")
  FadeIn = null;

  /** m_blinkType[TYPE_FADE_OUT] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBlink")
  FadeOut = null;

  /** m_blinkType[TYPE_CYCLE] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataBlink")
  Cycle = null;

  /** Gets blink data by Carbon enum value; TYPE_STATIC has no data record. */
  GetByType(blinkType)
  {
    const property = this.constructor.Types[blinkType];
    return property ? this[property] ?? null : null;
  }

  static Type = Object.freeze({
    STATIC: 0,
    BLINK: 1,
    FADE_IN: 2,
    FADE_OUT: 3,
    CYCLE: 4
  });

  static Types = Object.freeze([
    null,
    "Blink",
    "FadeIn",
    "FadeOut",
    "Cycle"
  ]);

}
