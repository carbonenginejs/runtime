// Source: trinity/trinity/Sprite2d/ITr2SpriteObject.h
import { meta } from "#schema";

/** Native IRoot-shaped abstract contract shared by Sprite2D objects. */
@meta.define({ className: "ITr2SpriteObject", family: "sprite2d", abstract: true })
export class ITr2SpriteObject
{
  /**
   * Required native GatherSprites contract.
   * @param {object} _renderer Sprite scene renderer.
   * @returns {void}
   */
  @meta.blue.method
  @meta.abstract
  GatherSprites(_renderer)
  {
    throw new Error("ITr2SpriteObject.GatherSprites must be implemented by a concrete sprite object.");
  }

  /**
   * Required native PickPoint contract.
   * @param {number} _x Horizontal coordinate.
   * @param {number} _y Vertical coordinate.
   * @param {object} _renderer Sprite scene renderer.
   * @returns {ITr2SpriteObject|null}
   */
  @meta.blue.method
  @meta.abstract
  PickPoint(_x, _y, _renderer)
  {
    throw new Error("ITr2SpriteObject.PickPoint must be implemented by a concrete sprite object.");
  }

  /**
   * Required native SetParent contract.
   * @param {ITr2SpriteObject|null} _parent New parent.
   * @returns {void}
   */
  @meta.blue.method
  @meta.abstract
  SetParent(_parent)
  {
    throw new Error("ITr2SpriteObject.SetParent must be implemented by a concrete sprite object.");
  }

  /**
   * Required native SetDirty contract.
   * @returns {void}
   */
  @meta.blue.method
  @meta.abstract
  SetDirty()
  {
    throw new Error("ITr2SpriteObject.SetDirty must be implemented by a concrete sprite object.");
  }

  /**
   * Required native SetChildDirty contract.
   * @param {ITr2SpriteObject|null} _child Changed child.
   * @returns {void}
   */
  @meta.blue.method
  @meta.abstract
  SetChildDirty(_child)
  {
    throw new Error("ITr2SpriteObject.SetChildDirty must be implemented by a concrete sprite object.");
  }

  /**
   * Required native IsAuxMouseover contract.
   * @returns {boolean}
   */
  @meta.blue.method
  @meta.abstract
  IsAuxMouseover()
  {
    throw new Error("ITr2SpriteObject.IsAuxMouseover must be implemented by a concrete sprite object.");
  }

}
