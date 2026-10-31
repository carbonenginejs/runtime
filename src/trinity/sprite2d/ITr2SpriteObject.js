import { exposure as be } from "#be";
import { IRoot } from "../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Sprite2d/ITr2SpriteObject.h
import { meta } from "#schema";

/**
 * Native IRoot-shaped abstract contract shared by Sprite2D objects.
 *
 * @abstract
 */
@be.interface("ITr2SpriteObject")
@be.inherit(IRoot)
@be.abstract
export class ITr2SpriteObject extends IRoot
{
  /**
   * Required native GatherSprites contract.
   *
   * @abstract
   * @param {object} _renderer Sprite scene renderer.
   * @returns {void}
   */
  @meta.abstract
  GatherSprites(_renderer) {}

  /**
   * Required native PickPoint contract.
   *
   * @abstract
   * @param {number} _x Horizontal coordinate.
   * @param {number} _y Vertical coordinate.
   * @param {object} _renderer Sprite scene renderer.
   * @returns {ITr2SpriteObject|null}
   */
  @meta.abstract
  PickPoint(_x, _y, _renderer) {}

  /**
   * Required native SetParent contract.
   *
   * @abstract
   * @param {ITr2SpriteObject|null} _parent New parent.
   * @returns {void}
   */
  @meta.abstract
  SetParent(_parent) {}

  /**
   * Required native SetDirty contract.
   *
   * @abstract
   * @returns {void}
   */
  @meta.abstract
  SetDirty() {}

  /**
   * Required native SetChildDirty contract.
   *
   * @abstract
   * @param {ITr2SpriteObject|null} _child Changed child.
   * @returns {void}
   */
  @meta.abstract
  SetChildDirty(_child) {}

  /**
   * Required native IsAuxMouseover contract.
   *
   * @abstract
   * @returns {boolean}
   */
  @meta.abstract
  IsAuxMouseover() {}

}
