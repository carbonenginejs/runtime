// Source: blue/include/ITr2DebugRenderer2.h:37-94
import { CjsSchema, blue } from "../schema/index.js";
import { color as colorMath } from "../math/color.js";

// Scratch for GetAutoSelectedColor's Color temporary (debug drawing is single-threaded).
const AUTO_SELECTED_SCRATCH = colorMath.create();

// Carbon adds the float literal 0.7f.
const SELECTED_BOOST = Math.fround(0.7);

/**
 * The colours one debug primitive is drawn with: a front colour, a colour for
 * the parts hidden behind other geometry, and the same pair for when the
 * owner is selected. Every value is a packed ARGB word.
 *
 * Carbon has no default constructor; every one of its five constructors
 * becomes a `create__` factory, and the JavaScript constructor leaves all four
 * words at zero. Carbon's call sites convert a `Color` or a `uint32_t`
 * implicitly; JavaScript callers name the factory.
 */
export class Tr2DebugColor
{
  /** m_color: front color. */
  color = 0;

  /** m_zFailColor: color for things behind other geometry. */
  zFailColor = 0;

  /** m_colorSelected: front color when the object is selected. */
  colorSelected = 0;

  /** m_zFailColorSelected: color for things behind other geometry when the object is selected. */
  zFailColorSelected = 0;

  /**
   * Brightens a packed color by 0.7 per RGB channel, clamped at one, leaving
   * alpha alone (h:48-55).
   * @param {number} color Packed ARGB word.
   * @returns {number} Packed ARGB word.
   */
  GetAutoSelectedColor(color)
  {
    const c = colorMath.fromARGB(AUTO_SELECTED_SCRATCH, color);
    c[0] = Math.min(1, c[0] + SELECTED_BOOST);
    c[1] = Math.min(1, c[1] + SELECTED_BOOST);
    c[2] = Math.min(1, c[2] + SELECTED_BOOST);
    return colorMath.toARGB(c);
  }

  /**
   * Carbon's `Tr2DebugColor( uint32_t color )` (h:57-63).
   * @param {number} color Packed ARGB word.
   * @returns {Tr2DebugColor}
   */
  static create__Uint32(color)
  {
    const debugColor = new Tr2DebugColor();
    debugColor.color = color >>> 0;
    debugColor.zFailColor = 0;
    debugColor.colorSelected = debugColor.GetAutoSelectedColor(color);
    debugColor.zFailColorSelected = 0;
    return debugColor;
  }

  /**
   * Carbon's `Tr2DebugColor( const Color& color )` (h:65-71).
   * @param {Float32Array} color A Color.
   * @returns {Tr2DebugColor}
   */
  static create__Color(color)
  {
    return Tr2DebugColor.create__Uint32(colorMath.toARGB(color));
  }

  /**
   * Carbon's `Tr2DebugColor( uint32_t color, uint32_t zFailColor )` (h:73-79).
   * @param {number} color Packed ARGB word.
   * @param {number} zFailColor Packed ARGB word.
   * @returns {Tr2DebugColor}
   */
  static create__Uint32ZFail(color, zFailColor)
  {
    const debugColor = new Tr2DebugColor();
    debugColor.color = color >>> 0;
    debugColor.zFailColor = zFailColor >>> 0;
    debugColor.colorSelected = debugColor.GetAutoSelectedColor(color);
    debugColor.zFailColorSelected = debugColor.GetAutoSelectedColor(zFailColor);
    return debugColor;
  }

  /**
   * Carbon's `Tr2DebugColor( const Color& color, const Color& zFailColor )` (h:81-87).
   * @param {Float32Array} color A Color.
   * @param {Float32Array} zFailColor A Color.
   * @returns {Tr2DebugColor}
   */
  static create__ColorZFail(color, zFailColor)
  {
    return Tr2DebugColor.create__Uint32ZFail(colorMath.toARGB(color), colorMath.toARGB(zFailColor));
  }

  /**
   * Carbon's four-Color constructor (h:89-95): every word given explicitly.
   * @param {Float32Array} color A Color.
   * @param {Float32Array} zFailColor A Color.
   * @param {Float32Array} selectedColor A Color.
   * @param {Float32Array} zFailSelectedColor A Color.
   * @returns {Tr2DebugColor}
   */
  static create__ColorZFailSelected(color, zFailColor, selectedColor, zFailSelectedColor)
  {
    const debugColor = new Tr2DebugColor();
    debugColor.color = colorMath.toARGB(color);
    debugColor.zFailColor = colorMath.toARGB(zFailColor);
    debugColor.colorSelected = colorMath.toARGB(selectedColor);
    debugColor.zFailColorSelected = colorMath.toARGB(zFailSelectedColor);
    return debugColor;
  }
}

// Declared as a call, not a decorator: global/interfaces is imported straight
// from source by tests, and raw Node cannot parse decorator syntax.
CjsSchema.decorateMethod(Tr2DebugColor, "GetAutoSelectedColor", blue.method);
CjsSchema.meta.carbon("Tr2DebugColor")(Tr2DebugColor);
