import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:301-324
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:70-77, 1140-1147
import { blue } from "#schema";
import { be, EnumRegistrationType } from "#blue";

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

/** One exposed `m_blinkType[type]` slot, named by its chooser key (EveSOFData_Blue.cpp:1143-1146). */
const slot = (name, index) => ({ name, key: "blinkType", index, type: { kind: "rootRef", className: "EveSOFDataBlink" },
  edit: { read: true, write: true, persist: true } });

/**
 * Blink settings slots: `EveSOFDataBlinkPtr m_blinkType[TYPE_CYCLE]`, exposed
 * by chooser name. TYPE_STATIC has no exposed slot. Nothing in Carbon reads
 * the slots. Native IRoot-only data with no lifecycle.
 */
@blue.define({
  className: "EveSOFDataBlinkType",
  members: [
  slot("Blink", BlinkType.TYPE_BLINK),
  slot("FadeIn", BlinkType.TYPE_FADE_IN),
  slot("FadeOut", BlinkType.TYPE_FADE_OUT),
  // Adapted: Carbon's slot is one past the end of its array (CE-115); see `blinkType`.
  { ...slot("Cycle", BlinkType.TYPE_CYCLE), impl: { adapted: true, status: "adapted" } }
]
})
@blue.interface()
@blue.inherit(IRoot)
export class EveSOFDataBlinkType
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
  blinkType = new Array(BlinkType.TYPE_CYCLE + 1).fill(null);
}

// Native chooser labels and descriptions are distinct from C++ member names.
be.enums.Create("trinity.EveSOFDataBlinkType.BlinkType", BlinkType, {
  exposedName: "EveSOFDataBlinkType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Static", value: BlinkType.TYPE_STATIC, description: "Static, no blinking" },
    { name: "Blink", value: BlinkType.TYPE_BLINK, description: "Regular blink" },
    { name: "FadeIn", value: BlinkType.TYPE_FADE_IN, description: "Fade in" },
    { name: "FadeOut", value: BlinkType.TYPE_FADE_OUT, description: "Fade out" },
    { name: "Cycle", value: BlinkType.TYPE_CYCLE, description: "Cycle (fade in/out)" }
  ]
});
