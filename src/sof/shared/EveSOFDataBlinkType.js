// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { blue, EnumRegistrationType } from "#blue";

/** EveSOFDataBlinkType (eve) - generated from schema shapeHash db502493.... */
@type.define({ className: "EveSOFDataBlinkType", family: "eve" })
export class EveSOFDataBlinkType extends CjsModel
{

  /** m_blinkType[TYPE_BLINK] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  Blink = null;

  /** m_blinkType[TYPE_FADE_IN] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  FadeIn = null;

  /** m_blinkType[TYPE_FADE_OUT] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  FadeOut = null;

  /** m_blinkType[TYPE_CYCLE] (EveSOFDataBlinkPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  Cycle = null;

  /** Gets blink data by Carbon enum value; TYPE_STATIC has no data record. */
  GetByType(blinkType)
  {
    const property = this.constructor.Types[blinkType];
    return property ? this[property] ?? null : null;
  }

  // Source: EveSOFData.h, EveSOFDataBlinkType::BlinkType. Keep the donor
  // spelling for schema choosers; Type below is the existing JS compatibility map.
  static BlinkType = Object.freeze({
    TYPE_STATIC: 0,
    TYPE_BLINK: 1,
    TYPE_FADE_IN: 2,
    TYPE_FADE_OUT: 3,
    TYPE_CYCLE: 4
  });

  static Type = Object.freeze({
    STATIC: EveSOFDataBlinkType.BlinkType.TYPE_STATIC,
    BLINK: EveSOFDataBlinkType.BlinkType.TYPE_BLINK,
    FADE_IN: EveSOFDataBlinkType.BlinkType.TYPE_FADE_IN,
    FADE_OUT: EveSOFDataBlinkType.BlinkType.TYPE_FADE_OUT,
    CYCLE: EveSOFDataBlinkType.BlinkType.TYPE_CYCLE
  });

  static Types = Object.freeze([
    null,
    "Blink",
    "FadeIn",
    "FadeOut",
    "Cycle"
  ]);

}

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.RegisterEnum("trinity.EveSOFDataBlinkType.BlinkType", EveSOFDataBlinkType.BlinkType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 312,
  exposedName: "EveSOFDataBlinkType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:70",
  chooser: [
    { name: "Static", value: EveSOFDataBlinkType.BlinkType.TYPE_STATIC, description: "Static, no blinking" },
    { name: "Blink", value: EveSOFDataBlinkType.BlinkType.TYPE_BLINK, description: "Regular blink" },
    { name: "FadeIn", value: EveSOFDataBlinkType.BlinkType.TYPE_FADE_IN, description: "Fade in" },
    { name: "FadeOut", value: EveSOFDataBlinkType.BlinkType.TYPE_FADE_OUT, description: "Fade out" },
    { name: "Cycle", value: EveSOFDataBlinkType.BlinkType.TYPE_CYCLE, description: "Cycle (fade in/out)" }
  ]
});
