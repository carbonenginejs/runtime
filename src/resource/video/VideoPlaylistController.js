// Source: videoplayer/python/videoplayer/playlistresource.py
//
// Carbon's video playlists are Python. `register_resource_constructor`
// (playlistresource.py:231-254) registers one blue.resMan dynamic constructor
// per playlist name, so `dynamic:/<name>` resolves through it. Each call hands
// back a plain `trinity.TriTextureRes` (:53) that `videoplayer::VideoPlayer`
// fills through its `bgra_texture` (:117-118; VideoPlayer.h:48-54). The
// texture is sized BGRA8 when the first frame's size is known (:144), and the
// controller plays the next path when a video reaches DONE (:130). So there is
// no video texture class to port: the texture is TriTextureRes and the writer
// is VideoPlayer.
//
// VideoPlayer is not ported yet (resource/video holds its decoder interfaces
// only), so until it is, the texture is a placeholder colour. There is one
// texture per playlist, shared by every plane that names it, because in the
// game the same video plays everywhere a list is used (operator, 2026-09-28).
import { IBlueDynamicResourceConstructor } from "#blue";
import { TriTextureRes } from "../texture/TriTextureRes.js";
import { ColorPrefix } from "../texture/solidColorTexture.js";

/** The placeholder shown until VideoPlayer writes frames: opaque black. */
const PLACEHOLDER_COLOR = "0,0,0,1";

/**
 * Carbon's `_VideoPlaylistController` (playlistresource.py:24) in its role as
 * the `play` constructor `register_resource_constructor` registers: one
 * playlist's texture.
 */
export class VideoPlaylistController extends IBlueDynamicResourceConstructor
{
  /** The videos this playlist plays, in play order. */
  playlist = [];

  /**
   * @param {string[]} playlist Resource paths, in play order.
   * @throws {TypeError} If the playlist is empty.
   */
  constructor(playlist)
  {
    super();
    if (!Array.isArray(playlist) || playlist.length === 0)
    {
      throw new TypeError("VideoPlaylistController needs at least one video path.");
    }
    this.playlist = [ ...playlist ];
  }

  /**
   * One texture for the whole playlist, kept once built: every plane naming
   * the list shows the same video.
   *
   * @returns {boolean} Always true.
   */
  IsCacheable()
  {
    return true;
  }

  /**
   * `play(param_string)` (playlistresource.py:243-252): the playlist's texture.
   * Carbon's query string feeds keyword arguments to the host's playlist
   * generator. A fixed list takes none, so the query is ignored.
   *
   * @param {string} _query Text after `dynamic:/<name>/`.
   * @returns {TriTextureRes} The playlist's texture: the placeholder colour until VideoPlayer is ported.
   */
  GetResource(_query)
  {
    const texture = new TriTextureRes();
    texture.Initialize(ColorPrefix + PLACEHOLDER_COLOR, "");
    return texture;
  }
}

/**
 * Registers one dynamic constructor per playlist, as Carbon's hosts call
 * `register_resource_constructor` for each name (playlistresource.py:231).
 * Names are lowercased by the manager. An empty list unregisters its name.
 * Each list is shuffled once here: play order is host policy (Carbon takes it
 * from the host's playlist generator), and this is the order ccpwgl used.
 *
 * @param {import("../../global/blue/IBlueResMan.js").IBlueResMan} resourceManager Any IBlueResMan.
 * @param {Object<string, string[]>} playlists Playlist name to resource paths, e.g. `{ inspacevideos: [...] }`.
 * @param {{random?: () => number}} [options] `random` for the shuffle (default Math.random).
 * @returns {object} The same manager, for chaining.
 */
export function RegisterVideoPlaylists(resourceManager, playlists, { random = Math.random } = {})
{
  for (const [ name, paths ] of Object.entries(playlists))
  {
    if (paths.length === 0)
    {
      resourceManager.UnregisterResourceConstructor(name);
      continue;
    }
    const order = [ ...paths ];
    for (let i = order.length - 1; i > 0; i--)
    {
      const j = Math.floor(random() * (i + 1));
      [ order[i], order[j] ] = [ order[j], order[i] ];
    }
    resourceManager.RegisterResourceConstructor(name, new VideoPlaylistController(order));
  }
  return resourceManager;
}
