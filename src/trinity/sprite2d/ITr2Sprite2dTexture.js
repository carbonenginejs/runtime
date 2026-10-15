// Source: trinity/trinity/Sprite2d/ITr2Sprite2dTexture.h
import { meta, blue } from "#schema";

/** Native nominal contract for Sprite2D texture inputs. */
@blue.define({ className: "ITr2Sprite2dTexture", abstract: true })
export class ITr2Sprite2dTexture
{
  /** Applies the texture and sampling settings. */
  @meta.abstract
  Apply(_renderer, _index)
  {
    throw new Error("ITr2Sprite2dTexture.Apply must be implemented by a concrete texture.");
  }

  /** Returns texture width. */
  @meta.abstract
  GetWidth()
  {
    throw new Error("ITr2Sprite2dTexture.GetWidth must be implemented by a concrete texture.");
  }

  /** Returns texture height. */
  @meta.abstract
  GetHeight()
  {
    throw new Error("ITr2Sprite2dTexture.GetHeight must be implemented by a concrete texture.");
  }

  /** Returns the source window width. */
  @meta.abstract
  GetSrcWidth()
  {
    throw new Error("ITr2Sprite2dTexture.GetSrcWidth must be implemented by a concrete texture.");
  }

  /** Returns the source window height. */
  @meta.abstract
  GetSrcHeight()
  {
    throw new Error("ITr2Sprite2dTexture.GetSrcHeight must be implemented by a concrete texture.");
  }

  /** Reports asynchronous texture loading. */
  @meta.abstract
  IsLoading()
  {
    throw new Error("ITr2Sprite2dTexture.IsLoading must be implemented by a concrete texture.");
  }

  /** Reports whether the texture is ready. */
  @meta.abstract
  IsGood()
  {
    throw new Error("ITr2Sprite2dTexture.IsGood must be implemented by a concrete texture.");
  }

  /** Registers a change listener. */
  @meta.abstract
  RegisterForChangeNotification(_target)
  {
    throw new Error("ITr2Sprite2dTexture.RegisterForChangeNotification must be implemented by a concrete texture.");
  }

  /** Removes a change listener. */
  @meta.abstract
  UnregisterForChangeNotification(_target)
  {
    throw new Error("ITr2Sprite2dTexture.UnregisterForChangeNotification must be implemented by a concrete texture.");
  }

}
