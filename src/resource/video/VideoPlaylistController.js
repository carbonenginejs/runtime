// Source: videoplayer/python/videoplayer/playlistresource.py:24-165,231-254
// One host-defined playlist owns one texture, player and colour sampler.
import { IBlueDynamicResourceConstructor } from "#blue";
import { CjsSchema, meta } from "#schema";
import { TriTextureRes } from "../texture/TriTextureRes.js";
import { State } from "./enums.js";
import { ColorPrefix } from "../texture/solidColorTexture.js";

const registrations = new WeakMap();

/** Carbon's _VideoPlaylistController, sharing a texture and injected browser player. */
export class VideoPlaylistController extends IBlueDynamicResourceConstructor
{
  playlist = [];

  video = null;

  currentPath = null;

  error = null;

  _texture = null;

  _generation = 0;

  _index = 0;

  _failures = 0;

  _retry = null;

  _readAbort = null;

  _readTimeout = null;

  /** Fixed list is host policy; browser construction is injected to retain headless resource imports. */
  constructor(playlist, { resourceManager = null, createPlayer = null, host = globalThis,
    retryDelay = 1000, loadTimeout = 30000 } = {})
  {
    super();
    if (!Array.isArray(playlist) || playlist.length === 0) throw new TypeError("VideoPlaylistController needs at least one video path.");
    this.playlist = [...playlist];
    this._resourceManager = resourceManager;
    this._createPlayer = createPlayer;
    this._host = host;
    this._retryDelay = retryDelay;
    this._loadTimeout = loadTimeout;
  }

  /** Decoding and GPU realization are shared even when the manager sees different query strings. */
  IsCacheable() { return true; }

  /** Return the shared opaque-black placeholder and start playback once, when configured by the host. */
  GetResource(_query)
  {
    if (this._texture) return this._texture;
    const texture = this._texture = new TriTextureRes();
    texture.Initialize(ColorPrefix + "0,0,0,1", "");
    texture.videoController = this;
    if (this._createPlayer)
    {
      this.video = this._createPlayer();
      this.video.bgraTexture = texture;
      this.video.onStateChange = player =>
      {
        if (player.GetState() === State.DONE) { this._failures = 0; this._PlayNext(); }
      };
      this.video.onError = player => this._OnError(player.error);
      this._PlayNext();
    }
    return texture;
  }

  /** Carbon play_next; byte acquisition stays on the manager's existing source/path-resolution route. */
  async _PlayNext()
  {
    const generation = ++this._generation;
    this._CancelRead();
    if (!this.video) return;
    this.currentPath = this.playlist[this._index];
    this._index = (this._index + 1) % this.playlist.length;
    this._readAbort = new AbortController();
    const signal = this._readAbort.signal;
    try
    {
      const deadline = new Promise((_, reject) =>
      {
        this._readTimeout = this._host.setTimeout(() =>
        {
          this._readAbort.abort();
          reject(new Error("Video resource read timed out"));
        }, this._loadTimeout);
      });
      const bytes = await Promise.race([
        this._resourceManager.ReadResource(this.currentPath, { cache: false, signal }), deadline
      ]);
      if (generation !== this._generation) return;
      this._CancelRead();
      this.video.Create(bytes);
    }
    catch (error)
    {
      if (generation !== this._generation) return;
      this._CancelRead();
      this._OnError(error);
    }
  }

  /** At most one failed pass through a playlist; no endless codec/read retry loop. */
  _OnError(error)
  {
    this.error = error;
    if (!this.video || this._retry !== null || ++this._failures >= this.playlist.length) return;
    const generation = this._generation;
    this._retry = this._host.setTimeout(() =>
    {
      this._retry = null;
      if (generation === this._generation) this._PlayNext();
    }, this._retryDelay);
  }

  /** Replace host policy while retaining the shared texture identity used by existing consumers. */
  SetPlaylist(playlist)
  {
    if (!Array.isArray(playlist) || !playlist.length) throw new TypeError("Playlist must not be empty");
    this.playlist = [...playlist];
    this._index = this._failures = 0;
    this.error = null;
    if (this._retry !== null) this._host.clearTimeout(this._retry);
    this._retry = null;
    if (this.video)
    {
      // Cancel the old player before an asynchronous replacement read can finish.
      const paused = this.video.IsPaused();
      this.video.Destroy();
      this.video = this._createPlayer();
      this.video.bgraTexture = this._texture;
      this.video.onStateChange = player =>
      {
        if (player.GetState() === State.DONE) { this._failures = 0; this._PlayNext(); }
      };
      this.video.onError = player => this._OnError(player.error);
      if (paused) this.video.Pause();
      this._PlayNext();
    }
  }

  /** Cancel an owned read/deadline; late source promises are rejected by generation. */
  _CancelRead()
  {
    if (this._readAbort) this._readAbort.abort();
    this._readAbort = null;
    if (this._readTimeout !== null) this._host.clearTimeout(this._readTimeout);
    this._readTimeout = null;
  }

  /** Carbon _destroy; called by resource purge, never by an individual billboard. */
  Destroy()
  {
    this._generation++;
    this._CancelRead();
    if (this._retry !== null) this._host.clearTimeout(this._retry);
    this._retry = null;
    if (this.video) this.video.Destroy();
    this.video = null;
    this.currentPath = null;
    this._texture = null;
  }
}

CjsSchema.define(VideoPlaylistController, { className: "VideoPlaylistController", carbon: "_VideoPlaylistController", methods: {
  GetResource: [meta.adapted], IsCacheable: [meta.ours], SetPlaylist: [meta.ours], Destroy: [meta.adapted]
} });

/**
 * Register host policy for dynamic playlist names. Shuffle once, then loop in
 * that order. createPlayer opts into browser playback; omission remains headless.
 * Re-registration updates the existing shared player; an empty list stops it.
 * @param {object} resourceManager The existing resource manager and byte source.
 * @param {Object<string,string[]>} playlists Host-defined logical resource paths.
 * @param {object} [options] random, createPlayer and optional timeout/test host settings.
 * @returns {object} The same manager.
 */
export function RegisterVideoPlaylists(resourceManager, playlists, { random = Math.random, ...options } = {})
{
  let registered = registrations.get(resourceManager);
  if (!registered) registrations.set(resourceManager, registered = new Map());
  for (const [name, paths] of Object.entries(playlists))
  {
    const key = name.toLowerCase(), previous = registered.get(key);
    if (paths.length === 0)
    {
      if (previous)
      {
        if (previous._texture) previous._texture.ReleasePayload();
        else previous.Destroy();
      }
      registered.delete(key);
      resourceManager.UnregisterResourceConstructor(name);
      continue;
    }
    const order = [...paths];
    for (let i = order.length - 1; i > 0; i--)
    {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (previous) previous.SetPlaylist(order);
    else
    {
      const controller = new VideoPlaylistController(order, { ...options, resourceManager });
      registered.set(key, controller);
      resourceManager.RegisterResourceConstructor(name, controller);
    }
  }
  return resourceManager;
}
