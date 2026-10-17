import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Sprite2d/ITr2Sprite2dTexture.h
import { blue } from "#schema";

/** Native nominal contract for Sprite2D texture inputs. */
@blue.define({ className: "ITr2Sprite2dTexture", abstract: true })
@blue.inherit(IRoot)
export class ITr2Sprite2dTexture
{
  /** Applies the texture and sampling settings. */
  @blue.abstract
  Apply(_renderer, _index) {}

  /** Returns texture width. */
  @blue.abstract
  GetWidth() {}

  /** Returns texture height. */
  @blue.abstract
  GetHeight() {}

  /** Returns the source window width. */
  @blue.abstract
  GetSrcWidth() {}

  /** Returns the source window height. */
  @blue.abstract
  GetSrcHeight() {}

  /** Reports asynchronous texture loading. */
  @blue.abstract
  IsLoading() {}

  /** Reports whether the texture is ready. */
  @blue.abstract
  IsGood() {}

  /** Registers a change listener. */
  @blue.abstract
  RegisterForChangeNotification(_target) {}

  /** Removes a change listener. */
  @blue.abstract
  UnregisterForChangeNotification(_target) {}

}
