// Source: trinity/trinity/EveSprite2dBracket.h
// Source: trinity/trinity/EveSprite2dBracket.cpp
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";


/**
 * Screen-space bracket drawn from an atlas icon, carrying its own colour, 2D
 * translation and display flag.
 */
@meta.define({ className: "EveSprite2dBracket", family: "eve/ui" })
export class EveSprite2dBracket
{
  @meta.blue.readwrite
  @meta.type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @meta.blue.readwrite
  @meta.type.objectRef("Tr2AtlasTexture")
  icon = null;

  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  @meta.blue.readwrite
  @meta.type.vec2
  translation = vec2.create();

  /**
   * Copies the bracket translation into caller-provided storage.
   */
  @meta.blue.method
  @meta.adapted
  GetTranslation(out)
  {
    return vec2.copy(out, this.translation);
  }

  /**
   * Replaces the bracket translation while preserving field identity.
   */
  @meta.blue.method
  @meta.adapted
  SetTranslation(value)
  {
    vec2.copy(this.translation, value);
  }

  /**
   * Gets the authored atlas icon.
   */
  @meta.blue.method
  @meta.implemented
  GetIcon()
  {
    return this.icon;
  }

  /**
   * Gets the mutable authored color container.
   */
  @meta.blue.method
  @meta.implemented
  GetColor()
  {
    return this.color;
  }

  /**
   * Sets whether the bracket is displayed.
   */
  @meta.blue.method
  @meta.implemented
  SetDisplay(display)
  {
    this.display = Boolean(display);
  }

  /**
   * Gets whether the bracket is displayed.
   */
  @meta.blue.method
  @meta.implemented
  IsDisplay()
  {
    return this.display;
  }

}
