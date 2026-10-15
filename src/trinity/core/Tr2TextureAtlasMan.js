// Source: trinity/trinity/Tr2TextureAtlasMan.h
// Source: trinity/trinity/Tr2TextureAtlasMan.cpp
// Source: trinity/trinity/Tr2TextureAtlasMan_Blue.cpp
// Hand-maintained port. Carbon guards `m_atlases` with a mutex because
// `FindAtlas` may run on a loading thread; JavaScript runs this single-threaded,
// so the mutex has nothing to guard and is not ported.
import { meta, type, blue } from "#schema";
import { Tr2TextureAtlas } from "./Tr2TextureAtlas.js";

/** Holds texture atlases and finds one for a given pixel format. */
@blue.define({ className: "Tr2TextureAtlasMan", purpose: "Holds texture atlases and finds one for a given pixel format." })
export class Tr2TextureAtlasMan
{

  /** m_atlases (PTr2TextureAtlasVectorRO) [READ] */
  @blue.read
  @type.list("Tr2TextureAtlas")
  atlases = [];

  /**
   * Returns the first atlas of a format (`Tr2TextureAtlasMan.cpp:19-32`).
   *
   * @param {number} fmt A `PixelFormat` value.
   * @returns {Tr2TextureAtlas|null} The atlas, or null.
   */
  @meta.implemented
  FindAtlas(fmt)
  {
    for (const atlas of this.atlases)
    {
      if (atlas.GetFormat() === fmt) return atlas;
    }

    return null;
  }

  /**
   * Creates, initialises and appends an atlas (`Tr2TextureAtlasMan.cpp:35-46`).
   *
   * In Carbon this C++ method is not Blue-exposed: Blue "AddAtlas" dispatches to
   * `AddAtlasWrap` (`Tr2TextureAtlasMan_Blue.cpp:19-26`). The JS schema
   * exposes a method under its own name and has no Blue-name alias, so the Blue
   * name lands here; `_AddAtlasWrap` forwards to it as Carbon's does.
   *
   * quirk, CE-149: Carbon only debug-asserts that no atlas of the format exists
   * (`CCP_ASSERT( !FindAtlas( fmt ) )`, :37); the shipped build appends a
   * second atlas, which `FindAtlas` never returns. That shipped behaviour is
   * what this does.
   *
   * @param {number} fmt A `PixelFormat` value.
   * @param {number} width Atlas width.
   * @param {number} height Atlas height.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  AddAtlas(fmt, width, height)
  {
    const atlas = new Tr2TextureAtlas();
    atlas.Initialize(fmt, width, height);
    this.atlases.push(atlas);
  }

  /**
   * Removes the first atlas of a format (`Tr2TextureAtlasMan.cpp:54-68`).
   * Textures keep the atlas they reference.
   *
   * Blue "RemoveAtlas" dispatches to `RemoveAtlasWrap` in Carbon
   * (`Tr2TextureAtlasMan_Blue.cpp:28-32`); see `AddAtlas` for why the Blue
   * name lands here.
   *
   * @param {number} fmt A `PixelFormat` value.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  RemoveAtlas(fmt)
  {
    for (let ix = 0; ix < this.atlases.length; ++ix)
    {
      if (this.atlases[ix].GetFormat() === fmt)
      {
        this.atlases.splice(ix, 1);
        break;
      }
    }
  }

  /**
   * Carbon's private Blue thunk for "AddAtlas" (`Tr2TextureAtlasMan.cpp:49-52`,
   * `Tr2TextureAtlasMan.h:30`): casts the unsigned format to `PixelFormat`
   * and calls `AddAtlas`. A JS number needs no cast.
   *
   * @param {number} fmt A `PixelFormat` value.
   * @param {number} width Atlas width.
   * @param {number} height Atlas height.
   * @returns {void}
   */
  @meta.implemented
  _AddAtlasWrap(fmt, width, height)
  {
    this.AddAtlas(fmt, width, height);
  }

  /**
   * Carbon's private Blue thunk for "RemoveAtlas" (`Tr2TextureAtlasMan.cpp:70-73`,
   * `Tr2TextureAtlasMan.h:31`): casts the unsigned format to `PixelFormat`
   * and calls `RemoveAtlas`. A JS number needs no cast.
   *
   * @param {number} fmt A `PixelFormat` value.
   * @returns {void}
   */
  @meta.implemented
  _RemoveAtlasWrap(fmt)
  {
    this.RemoveAtlas(fmt);
  }
}

/** `g_textureAtlasMan` (`Tr2TextureAtlasMan.cpp:9-10`), one per JavaScript realm. */
export const g_textureAtlasMan = new Tr2TextureAtlasMan();
