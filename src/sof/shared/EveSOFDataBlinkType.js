import { IRoot } from "../../blue/blueexposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:301-324
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:70-77, 1140-1147
import { type, blue as legacyBlue } from "#schema";
import { blue, EnumRegistrationType } from "#blue";

/**
 * `EveSOFDataBlinkType::BlinkType` (EveSOFData.h:312-319). Carbon sizes the
 * slot array by TYPE_CYCLE, so the enum has no TYPE_MAX.
 * @type {Object<string, number>}
 */
const BlinkType = {
  TYPE_STATIC: 0,
  TYPE_BLINK: 1,
  TYPE_FADE_IN: 2,
  TYPE_FADE_OUT: 3,
  TYPE_CYCLE: 4
};

/**
 * Blink settings slots: `EveSOFDataBlinkPtr m_blinkType[TYPE_CYCLE]`, exposed
 * by chooser name. TYPE_STATIC has no exposed slot. Nothing in Carbon reads
 * the slots. Native IRoot-only data with no lifecycle.
 */
@be.define("EveSOFDataBlinkType")
@legacyBlue.inherit(IRoot)
export class EveSOFDataBlinkType extends IRoot
{
  static BlinkType = BlinkType;

  /** Existing JavaScript aliases for the native TYPE_* enum names.
   * @type {Object<string, number>}
   */
  static Type = {
    STATIC: BlinkType.TYPE_STATIC,
    BLINK: BlinkType.TYPE_BLINK,
    FADE_IN: BlinkType.TYPE_FADE_IN,
    FADE_OUT: BlinkType.TYPE_FADE_OUT,
    CYCLE: BlinkType.TYPE_CYCLE
  };

  /**
   * m_blinkType: one blink settings record per BlinkType, or null.
   *
   * Adapted: one slot longer than Carbon's. Carbon declares
   * `m_blinkType[TYPE_CYCLE]` (four slots) but exposes "Cycle" at
   * `m_blinkType[TYPE_CYCLE]`, one past the end (Carbon defect CE-115,
   * EveSOFData.h:322, EveSOFData_Blue.cpp:1146). JavaScript cannot write past an
   * array into the next member, so slot TYPE_CYCLE exists here and authored
   * Cycle data round-trips; Carbon's behaviour there is undefined.
   * @type {Array<EveSOFDataBlink|null>}
   */
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Blink", BlinkType.TYPE_BLINK)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "FadeIn", BlinkType.TYPE_FADE_IN)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "FadeOut", BlinkType.TYPE_FADE_OUT)
  // Adapted: Carbon's slot is one past the end of its array (CE-115); see the field.
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Cycle", BlinkType.TYPE_CYCLE)
  @type.array({ kind: "rootRef", className: "EveSOFDataBlink" })
  blinkType = new Array(BlinkType.TYPE_CYCLE + 1).fill(null);
}

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.Create("trinity.EveSOFDataBlinkType.BlinkType", BlinkType, {
  exposedName: "EveSOFDataBlinkType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Static", value: BlinkType.TYPE_STATIC, description: "Static, no blinking" },
    { name: "Blink", value: BlinkType.TYPE_BLINK, description: "Regular blink" },
    { name: "FadeIn", value: BlinkType.TYPE_FADE_IN, description: "Fade in" },
    { name: "FadeOut", value: BlinkType.TYPE_FADE_OUT, description: "Fade out" },
    { name: "Cycle", value: BlinkType.TYPE_CYCLE, description: "Cycle (fade in/out)" }
  ]
});
