import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Sprite2d/ITr2SpriteObject.h
import { blue } from "#schema";

/** Native IRoot-shaped abstract contract shared by Sprite2D objects. */
@blue.define({ className: "ITr2SpriteObject", abstract: true })
@blue.inherit(IRoot)
export class ITr2SpriteObject extends IRoot
{
  /**
   * Required native GatherSprites contract.
   * @param {object} _renderer Sprite scene renderer.
   * @returns {void}
   */
  @blue.abstract
  GatherSprites(_renderer) {}

  /**
   * Required native PickPoint contract.
   * @param {number} _x Horizontal coordinate.
   * @param {number} _y Vertical coordinate.
   * @param {object} _renderer Sprite scene renderer.
   * @returns {ITr2SpriteObject|null}
   */
  @blue.abstract
  PickPoint(_x, _y, _renderer) {}

  /**
   * Required native SetParent contract.
   * @param {ITr2SpriteObject|null} _parent New parent.
   * @returns {void}
   */
  @blue.abstract
  SetParent(_parent) {}

  /**
   * Required native SetDirty contract.
   * @returns {void}
   */
  @blue.abstract
  SetDirty() {}

  /**
   * Required native SetChildDirty contract.
   * @param {ITr2SpriteObject|null} _child Changed child.
   * @returns {void}
   */
  @blue.abstract
  SetChildDirty(_child) {}

  /**
   * Required native IsAuxMouseover contract.
   * @returns {boolean}
   */
  @blue.abstract
  IsAuxMouseover() {}

}
