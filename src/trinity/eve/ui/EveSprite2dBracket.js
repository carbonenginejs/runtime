import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/EveSprite2dBracket.h
// Source: trinity/trinity/EveSprite2dBracket.cpp
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";


/**
 * Screen-space bracket drawn from an atlas icon, carrying its own colour, 2D
 * translation and display flag.
 */
@be.define("EveSprite2dBracket")
@blue.inherit(IRoot)

export class EveSprite2dBracket
{
  @blue.readwrite
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @blue.readwrite
  @type.rootRef("Tr2AtlasTexture")
  icon = null;

  @blue.readwrite
  @type.boolean
  display = true;

  @blue.readwrite
  @type.vec2
  translation = vec2.create();

  /**
   * Copies the bracket translation into caller-provided storage.
   */
  @blue.method
  @meta.adapted
  GetTranslation(out)
  {
    return vec2.copy(out, this.translation);
  }

  /**
   * Replaces the bracket translation while preserving field identity.
   */
  @blue.method
  @meta.adapted
  SetTranslation(value)
  {
    vec2.copy(this.translation, value);
  }

  /**
   * Gets the authored atlas icon.
   */
  @blue.method
  @meta.implemented
  GetIcon()
  {
    return this.icon;
  }

  /**
   * Gets the mutable authored color container.
   */
  @blue.method
  @meta.implemented
  GetColor()
  {
    return this.color;
  }

  /**
   * Sets whether the bracket is displayed.
   */
  @blue.method
  @meta.implemented
  SetDisplay(display)
  {
    this.display = Boolean(display);
  }

  /**
   * Gets whether the bracket is displayed.
   */
  @blue.method
  @meta.implemented
  IsDisplay()
  {
    return this.display;
  }

}
