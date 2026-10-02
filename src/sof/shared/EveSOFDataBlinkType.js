// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, edit, type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";

/**
 * Native IRoot container of optional empty blink settings records.
 * Exposure order follows EveSOFData_Blue.cpp:1137-1147. The native header
 * declares m_blinkType[TYPE_CYCLE] (four slots), yet exposure indexes
 * TYPE_CYCLE (four); the existing safe JavaScript Cycle=null slot is retained.
 */
@type.define({ className: "EveSOFDataBlinkType", family: "eve" })
export class EveSOFDataBlinkType
{

  /** Optional empty settings record for regular blink; native EveSOFDataBlinkPtr.
   * @type {EveSOFDataBlink|null}
   */
  @edit.readwrite
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  Blink = null;

  /** Optional empty settings record for fade-in; native EveSOFDataBlinkPtr.
   * @type {EveSOFDataBlink|null}
   */
  @edit.readwrite
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  FadeIn = null;

  /** Optional empty settings record for fade-out; native EveSOFDataBlinkPtr.
   * @type {EveSOFDataBlink|null}
   */
  @edit.readwrite
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  FadeOut = null;

  /** Optional empty settings record for fade-in/out cycle; native EveSOFDataBlinkPtr.
   * @type {EveSOFDataBlink|null}
   */
  @edit.readwrite
  @edit.persist
  @type.objectRef("EveSOFDataBlink")
  Cycle = null;

  /** Looks up the named slot through the existing JS enum table; no native method.
   * @param {number} blinkType BlinkType enum value.
   * @returns {EveSOFDataBlink|null} Settings, or null for static/unknown modes.
   */
  @impl.custom
  GetByType(blinkType)
  {
    const property = this.constructor.Types[blinkType];
    return property ? this[property] ?? null : null;
  }

  // Source: EveSOFData.h, EveSOFDataBlinkType::BlinkType. Keep the donor
  // spelling for schema choosers; Type below is the existing JS compatibility map.
  /** Native BlinkType numeric choices, shared with plane-item enum metadata.
   * @type {Readonly<Object<string, number>>}
   */
  static BlinkType = Object.freeze({
    TYPE_STATIC: 0,
    TYPE_BLINK: 1,
    TYPE_FADE_IN: 2,
    TYPE_FADE_OUT: 3,
    TYPE_CYCLE: 4
  });

  /** Existing JavaScript aliases for the native TYPE_* enum names.
   * @type {Readonly<Object<string, number>>}
   */
  static Type = Object.freeze({
    STATIC: EveSOFDataBlinkType.BlinkType.TYPE_STATIC,
    BLINK: EveSOFDataBlinkType.BlinkType.TYPE_BLINK,
    FADE_IN: EveSOFDataBlinkType.BlinkType.TYPE_FADE_IN,
    FADE_OUT: EveSOFDataBlinkType.BlinkType.TYPE_FADE_OUT,
    CYCLE: EveSOFDataBlinkType.BlinkType.TYPE_CYCLE
  });

  /** Enum-indexed property names; static mode has no settings slot.
   * @type {ReadonlyArray<string|null>}
   */
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

carbon.interfaceTable({ interfaces: [EveSOFDataBlinkType], chainTo: null })(EveSOFDataBlinkType);
