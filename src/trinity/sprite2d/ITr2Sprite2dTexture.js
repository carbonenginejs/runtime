import { exposure as be } from "#be";
import { IRoot } from "../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Sprite2d/ITr2Sprite2dTexture.h
import { meta } from "#schema";

/**
 * Native nominal contract for Sprite2D texture inputs.
 *
 * @abstract
 */
@be.interface("ITr2Sprite2dTexture")
@be.inherit(IRoot)
@be.abstract
export class ITr2Sprite2dTexture extends IRoot
{
  /**
   * Applies the texture and sampling settings.
   *
   * @abstract
   */
  @meta.abstract
  Apply(_renderer, _index) {}

  /**
   * Returns texture width.
   *
   * @abstract
   */
  @meta.abstract
  GetWidth() {}

  /**
   * Returns texture height.
   *
   * @abstract
   */
  @meta.abstract
  GetHeight() {}

  /**
   * Returns the source window width.
   *
   * @abstract
   */
  @meta.abstract
  GetSrcWidth() {}

  /**
   * Returns the source window height.
   *
   * @abstract
   */
  @meta.abstract
  GetSrcHeight() {}

  /**
   * Reports asynchronous texture loading.
   *
   * @abstract
   */
  @meta.abstract
  IsLoading() {}

  /**
   * Reports whether the texture is ready.
   *
   * @abstract
   */
  @meta.abstract
  IsGood() {}

  /**
   * Registers a change listener.
   *
   * @abstract
   */
  @meta.abstract
  RegisterForChangeNotification(_target) {}

  /**
   * Removes a change listener.
   *
   * @abstract
   */
  @meta.abstract
  UnregisterForChangeNotification(_target) {}

}
