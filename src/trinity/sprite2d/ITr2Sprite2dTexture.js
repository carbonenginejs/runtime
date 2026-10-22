import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Sprite2d/ITr2Sprite2dTexture.h
import { meta } from "#schema";

/** Native nominal contract for Sprite2D texture inputs. */
@be.interface("ITr2Sprite2dTexture")
@be.inherit(IRoot)
@be.abstract
export class ITr2Sprite2dTexture extends IRoot
{
  /** Applies the texture and sampling settings. */
  @meta.abstract
  Apply(_renderer, _index) {}

  /** Returns texture width. */
  @meta.abstract
  GetWidth() {}

  /** Returns texture height. */
  @meta.abstract
  GetHeight() {}

  /** Returns the source window width. */
  @meta.abstract
  GetSrcWidth() {}

  /** Returns the source window height. */
  @meta.abstract
  GetSrcHeight() {}

  /** Reports asynchronous texture loading. */
  @meta.abstract
  IsLoading() {}

  /** Reports whether the texture is ready. */
  @meta.abstract
  IsGood() {}

  /** Registers a change listener. */
  @meta.abstract
  RegisterForChangeNotification(_target) {}

  /** Removes a change listener. */
  @meta.abstract
  UnregisterForChangeNotification(_target) {}

}
