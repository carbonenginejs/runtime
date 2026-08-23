// Source: trinity/trinity/EveSprite2dBracket.h
// Source: trinity/trinity/EveSprite2dBracket.cpp
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Screen-space bracket drawn from an atlas icon, carrying its own colour, 2D
 * translation and display flag.
 */
@type.define({ className: "EveSprite2dBracket", family: "eve/ui" })
export class EveSprite2dBracket extends CjsModel
{
  @io.readwrite
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  @io.readwrite
  @type.objectRef("Tr2AtlasTexture")
  icon = null;

  @io.readwrite
  @type.boolean
  display = true;

  @io.readwrite
  @type.vec2
  translation = vec2.create();

  /**
   * Copies the bracket translation into caller-provided storage.
   */
  @carbon.method
  @impl.adapted
  GetTranslation(out)
  {
    return vec2.copy(out, this.translation);
  }

  /**
   * Replaces the bracket translation while preserving field identity.
   */
  @carbon.method
  @impl.adapted
  SetTranslation(value)
  {
    vec2.copy(this.translation, value);
  }

  /**
   * Gets the authored atlas icon.
   */
  @carbon.method
  @impl.implemented
  GetIcon()
  {
    return this.icon;
  }

  /**
   * Gets the mutable authored color container.
   */
  @carbon.method
  @impl.implemented
  GetColor()
  {
    return this.color;
  }

  /**
   * Sets whether the bracket is displayed.
   */
  @carbon.method
  @impl.implemented
  SetDisplay(display)
  {
    this.display = Boolean(display);
  }

  /**
   * Gets whether the bracket is displayed.
   */
  @carbon.method
  @impl.implemented
  IsDisplay()
  {
    return this.display;
  }

}
