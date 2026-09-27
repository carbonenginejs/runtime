import { throwIfAborted } from "#utils/errors";

// CarbonEngineJS original (no Carbon counterpart). Browser-only sequential
// playlist playback over a caller-supplied catalog and acquisition function.
import { installMusicLibrary } from "./library/musicLibrary.js";

const REPEAT_MODES = new Set([ "none", "playlist", "song" ]);

/**
 * Optional, neutral playlist player.
 *
 * The jukebox never fetches a path. `loadTrack(song, context)` is supplied by
 * the host and may return an AudioBuffer, ArrayBuffer, typed array, or
 * `{ bytes }`. Byte results are decoded by the attached AudioContext.
 * Replacing or stopping a pending selection cannot revive stale playback.
 * `isTrackAvailable(song, context)` is likewise host-owned; after
 * `RefreshAvailability()`, `GetPlaylistSongs(id, { includeUnavailable })`
 * lets a UI hide or disable unreachable songs.
 *
 * The jukebox is independent of `CjsMusicEngine`: it posts no Wwise events
 * and is never used to satisfy an authored event. Under `CjsAudioMan` it is
 * attached to the master bus on `Enable()`, stopped by `Disable()`,
 * `StopAllPlayingSounds()`, library replacement and `Dispose()`, and the
 * global `menu_main_music_level` RTPC sets its output volume. Repeat modes
 * are `none`, `playlist` and `song`.
 */
export class CjsJukebox
{
    _context = null;

    _destination = null;

    _library = null;

    _loadTrack = null;

    _isTrackAvailable = null;

    _availability = new Map();

    _availabilityRequestID = 0;

    _availabilityAbortController = null;

    _onChange = null;

    _outputGain = null;

    _playlist = null;

    _songIndex = -1;

    _source = null;

    _buffer = null;

    _offset = 0;

    _startedAt = 0;

    _state = "stopped";

    _volume = 1;

    _repeat = "none";

    _requestID = 0;

    _abortController = null;

    _lastError = null;

    /**
     * Creates a detached jukebox with optional catalog and host callbacks.
     *
     * @param {object} [options] Jukebox options.
     * @param {object|null} [options.library=null] Music-library document.
     * @param {Function|null} [options.loadTrack=null] Track acquisition callback.
     * @param {Function|null} [options.isTrackAvailable=null] Availability callback.
     * @param {number} [options.volume=1] Initial output level.
     * @param {string} [options.repeat="none"] Initial repeat mode.
     * @param {Function|null} [options.onChange=null] State observer.
     */
    constructor({
        library = null,
        loadTrack = null,
        isTrackAvailable = null,
        volume = 1,
        repeat = "none",
        onChange = null,
    } = {})
    {
        this.SetVolume(volume);
        this.SetRepeat(repeat);
        this.SetOnChange(onChange);
        if (loadTrack !== null)
        {
            this.SetTrackLoader(loadTrack);
        }
        if (isTrackAvailable !== null)
        {
            this.SetTrackAvailabilityChecker(isTrackAvailable);
        }
        if (library !== null)
        {
            this.InstallLibrary(library);
        }
    }

    /** Returns the installed immutable music-library catalog. */
    get library()
    {
        return this._library;
    }

    /** Returns the selected playlist, or null before a selection. */
    get currentPlaylist()
    {
        return this._playlist;
    }

    /** Returns the selected song, or null before a selection. */
    get currentSong()
    {
        return this._playlist?.songs[this._songIndex] ?? null;
    }

    /** Returns stopped, loading, playing, or paused. */
    get state()
    {
        return this._state;
    }

    /** Returns the current zero-based playlist position. */
    get songIndex()
    {
        return this._songIndex;
    }

    /** Returns the current output level in the inclusive 0..1 range. */
    get volume()
    {
        return this._volume;
    }

    /** Returns none, playlist, or song. */
    get repeat()
    {
        return this._repeat;
    }

    /** Returns the most recent asynchronous playback failure. */
    get lastError()
    {
        return this._lastError;
    }

    /** Installs a detached catalog and clears the previous selection. */
    InstallLibrary(library)
    {
        this.Stop();
        this._availabilityRequestID++;
        this._availabilityAbortController?.abort();
        this._availabilityAbortController = null;
        this._library = installMusicLibrary(library);
        this._playlist = null;
        this._songIndex = -1;
        this._buffer = null;
        this._availability.clear();
        this._lastError = null;
        this._Notify();
        return this._library;
    }

    /** Replaces the caller-owned track acquisition function. */
    SetTrackLoader(loadTrack)
    {
        if (typeof loadTrack !== "function")
        {
            throw new TypeError(
                "CjsJukebox loadTrack must be a function",
            );
        }
        this._loadTrack = loadTrack;
        return this;
    }

    /** Replaces the optional asynchronous track-availability probe. */
    SetTrackAvailabilityChecker(isTrackAvailable)
    {
        if (typeof isTrackAvailable !== "function")
        {
            throw new TypeError(
                "CjsJukebox isTrackAvailable must be a function",
            );
        }
        this._isTrackAvailable = isTrackAvailable;
        this._availabilityRequestID++;
        this._availabilityAbortController?.abort();
        this._availabilityAbortController = null;
        this._availability.clear();
        return this;
    }

    /**
     * Probes one playlist or the complete catalog through the caller-owned
     * availability function. Probe errors mark a song unavailable.
     */
    async RefreshAvailability(playlistID = null, { signal = null } = {})
    {
        const library = this._RequireLibrary();
        const playlists = playlistID === null
            ? library.playlists
            : [ this._FindPlaylist(playlistID) ];

        if (!this._isTrackAvailable)
        {
            return playlists.flatMap(playlist => this.GetPlaylistSongs(
                playlist.id,
                { includeUnavailable: true },
            ));
        }

        this._availabilityAbortController?.abort();
        const requestID = ++this._availabilityRequestID;
        const controller = new AbortController();
        const abort = () => controller.abort(signal?.reason);

        this._availabilityAbortController = controller;
        signal?.addEventListener?.("abort", abort, { once: true });

        try
        {
            await Promise.all(playlists.flatMap(playlist =>
                playlist.songs.map(async song =>
                {
                    let available = false;

                    try
                    {
                        available = Boolean(await this._isTrackAvailable(
                            song,
                            {
                                signal: controller.signal,
                                playlist,
                                library,
                            },
                        ));
                    }
                    catch (error)
                    {
                        if (controller.signal.aborted)
                        {
                            throw error;
                        }
                    }

                    if (requestID === this._availabilityRequestID)
                    {
                        this._availability.set(
                            AvailabilityKey(playlist.id, song.id),
                            available,
                        );
                    }
                }),
            ));
            throwIfAborted(controller.signal, "The operation was aborted");
        }
        finally
        {
            signal?.removeEventListener?.("abort", abort);
            if (requestID === this._availabilityRequestID)
            {
                this._availabilityAbortController = null;
            }
        }

        this._Notify();
        return playlists.flatMap(playlist => this.GetPlaylistSongs(
            playlist.id,
            { includeUnavailable: true },
        ));
    }

    /**
     * Returns playlist songs plus `availability`: available, unavailable, or
     * unknown. Callers choose whether known-unavailable songs stay visible.
     */
    GetPlaylistSongs(playlistID, { includeUnavailable = true } = {})
    {
        const playlist = this._FindPlaylist(playlistID);

        return playlist.songs
            .map(song => ({
                ...song,
                availability: this.GetTrackAvailability(
                    song.id,
                    { playlistID: playlist.id },
                ),
            }))
            .filter(song =>
                includeUnavailable || song.availability !== "unavailable");
    }

    /** Returns available, unavailable, or unknown for one catalog song. */
    GetTrackAvailability(songID, { playlistID = null } = {})
    {
        const id = String(songID);
        const playlists = playlistID === null
            ? this._RequireLibrary().playlists
            : [ this._FindPlaylist(playlistID) ];

        for (const playlist of playlists)
        {
            if (!playlist.songs.some(song => song.id === id))
            {
                continue;
            }
            const value = this._availability.get(
                AvailabilityKey(playlist.id, id),
            );

            return value === undefined
                ? "unknown"
                : value ? "available" : "unavailable";
        }
        throw new RangeError(`Unknown music-library song ${id}`);
    }

    /** Replaces the optional state observer. */
    SetOnChange(onChange)
    {
        if (onChange !== null && typeof onChange !== "function")
        {
            throw new TypeError(
                "CjsJukebox onChange must be a function or null",
            );
        }
        this._onChange = onChange;
        return this;
    }

    /**
     * Attaches to a realized browser AudioContext and destination mix bus.
     * Reattaching to the same pair is idempotent.
     */
    Attach(context, destination = context?.destination)
    {
        if (!context
            || typeof context.createGain !== "function"
            || typeof context.createBufferSource !== "function"
            || typeof context.decodeAudioData !== "function")
        {
            throw new TypeError(
                "CjsJukebox requires a Web Audio compatible context",
            );
        }
        if (!destination)
        {
            throw new TypeError(
                "CjsJukebox requires an output destination",
            );
        }
        if (this._context === context
            && this._destination === destination
            && this._outputGain)
        {
            return this;
        }

        this.Stop();
        this._outputGain?.disconnect?.();
        this._context = context;
        this._destination = destination;
        this._outputGain = context.createGain();
        SetAudioParam(this._outputGain.gain, this._volume, context);
        this._outputGain.connect(destination);
        return this;
    }

    /** Stops playback and disconnects from the current browser mix bus. */
    Detach()
    {
        this.Stop();
        this._outputGain?.disconnect?.();
        this._outputGain = null;
        this._destination = null;
        this._context = null;
    }

    /** Selects a playlist and starts at its requested zero-based index. */
    PlayPlaylist(playlistID, { index = 0 } = {})
    {
        const playlist = this._FindPlaylist(playlistID);
        const normalizedIndex = NormalizeIndex(index, playlist.songs.length);

        return this._SelectAndPlay(playlist, normalizedIndex);
    }

    /**
     * Selects a song by id. Supplying playlistID disambiguates duplicated song
     * ids in different playlists.
     */
    PlaySong(songID, { playlistID = null } = {})
    {
        const id = String(songID);
        const playlists = playlistID === null
            ? this._RequireLibrary().playlists
            : [ this._FindPlaylist(playlistID) ];

        for (const playlist of playlists)
        {
            const index = playlist.songs.findIndex(song => song.id === id);

            if (index !== -1)
            {
                return this._SelectAndPlay(playlist, index);
            }
        }

        return Promise.reject(
            new RangeError(`Unknown music-library song ${id}`),
        );
    }

    /** Starts or resumes the current selection, or the first library song. */
    Play()
    {
        if (this._state === "paused" && this._buffer)
        {
            this._StartBuffer(this._offset);
            return Promise.resolve(this.currentSong);
        }
        if (this._playlist && this._songIndex >= 0)
        {
            if (this._buffer)
            {
                this._StartBuffer(0);
                return Promise.resolve(this.currentSong);
            }
            return this._LoadAndPlay();
        }

        const playlist = this._RequireLibrary().playlists[0];
        const index = this._FindAvailableIndex(
            playlist,
            -1,
            1,
            false,
        );

        return index === -1
            ? Promise.reject(new Error(
                `Music-library playlist ${playlist.id} has no available songs`,
            ))
            : this._SelectAndPlay(playlist, index);
    }

    /** Pauses the current buffer while retaining its decoded data. */
    Pause()
    {
        if (this._state !== "playing" || !this._source)
        {
            return false;
        }

        const elapsed = Math.max(
            0,
            Number(this._context?.currentTime) - this._startedAt,
        );

        this._offset = Math.min(
            Math.max(0, Number(this._buffer?.duration) || 0),
            this._offset + elapsed,
        );
        this._StopSource();
        this._state = "paused";
        this._Notify();
        return true;
    }

    /** Resumes a paused selection without reacquiring it. */
    Resume()
    {
        if (this._state !== "paused" || !this._buffer)
        {
            return false;
        }
        this._StartBuffer(this._offset);
        return true;
    }

    /** Stops current loading/playback while retaining the selected song. */
    Stop()
    {
        this._CancelPending();
        this._StopSource();
        this._offset = 0;
        if (this._state !== "stopped")
        {
            this._state = "stopped";
            this._Notify();
        }
    }

    /** Advances to the next song under the current repeat policy. */
    Next()
    {
        return this._Move(1, true);
    }

    /** Returns to the previous song, or restarts after three elapsed seconds. */
    Previous()
    {
        if (this._state === "playing"
            && Number(this._context?.currentTime) - this._startedAt > 3)
        {
            this._StartBuffer(0);
            return Promise.resolve(this.currentSong);
        }
        return this._Move(-1, true);
    }

    /** Sets the independent jukebox output level. */
    SetVolume(value)
    {
        const numeric = Number(value);

        if (!Number.isFinite(numeric))
        {
            throw new TypeError("CjsJukebox volume must be finite");
        }
        this._volume = Math.max(0, Math.min(1, numeric));
        SetAudioParam(
            this._outputGain?.gain,
            this._volume,
            this._context,
        );
        this._Notify();
        return this._volume;
    }

    /** Sets end-of-song behavior: none, playlist, or song. */
    SetRepeat(repeat)
    {
        const value = String(repeat);

        if (!REPEAT_MODES.has(value))
        {
            throw new TypeError(
                `Unsupported CjsJukebox repeat mode ${value}`,
            );
        }
        this._repeat = value;
        this._Notify();
        return value;
    }

    /** Returns a stable, UI-friendly state snapshot. */
    GetStatus()
    {
        return {
            state: this._state,
            library: this._library,
            playlist: this._playlist,
            song: this.currentSong,
            songIndex: this._songIndex,
            volume: this._volume,
            repeat: this._repeat,
            error: this._lastError,
            availability: this.currentSong
                ? this.GetTrackAvailability(
                    this.currentSong.id,
                    { playlistID: this._playlist.id },
                )
                : "unknown",
        };
    }

    /** Releases browser nodes and installed catalog references. */
    Dispose()
    {
        this.Detach();
        this._library = null;
        this._playlist = null;
        this._songIndex = -1;
        this._buffer = null;
        this._loadTrack = null;
        this._isTrackAvailable = null;
        this._availabilityAbortController?.abort();
        this._availabilityAbortController = null;
        this._availability.clear();
        this._onChange = null;
        this._lastError = null;
    }

    /**
     * Selects an indexed song and begins asynchronous playback.
     *
     * @param {object} playlist Installed playlist.
     * @param {number} index Zero-based song index.
     * @returns {Promise<object|null>} Selected song after playback starts.
     */
    _SelectAndPlay(playlist, index)
    {
        const song = playlist.songs[index];
        const available = this._availability.get(
            AvailabilityKey(playlist.id, song.id),
        );

        if (available === false)
        {
            return Promise.reject(
                new Error(`Music-library song ${song.id} is unavailable`),
            );
        }

        this._CancelPending();
        this._StopSource();
        this._playlist = playlist;
        this._songIndex = index;
        this._buffer = null;
        this._offset = 0;
        this._lastError = null;
        return this._LoadAndPlay();
    }

    /** Acquires, decodes, and starts the currently selected song. */
    async _LoadAndPlay()
    {
        const song = this.currentSong;

        if (!song)
        {
            throw new Error("CjsJukebox has no selected song");
        }
        if (!this._context || !this._outputGain)
        {
            throw new Error(
                "CjsJukebox must be attached before playback",
            );
        }
        if (!this._loadTrack)
        {
            throw new Error("CjsJukebox has no track loader");
        }

        this._CancelPending();
        const requestID = ++this._requestID;
        const controller = new AbortController();

        this._abortController = controller;
        this._state = "loading";
        this._Notify();

        try
        {
            const loaded = await this._loadTrack(song, {
                signal: controller.signal,
                playlist: this._playlist,
                library: this._library,
            });
            throwIfAborted(controller.signal, "The operation was aborted");
            const buffer = await DecodeTrack(this._context, loaded);
            throwIfAborted(controller.signal, "The operation was aborted");

            if (requestID !== this._requestID)
            {
                return null;
            }

            this._abortController = null;
            this._buffer = buffer;
            this._offset = 0;
            this._lastError = null;
            this._StartBuffer(0);
            return song;
        }
        catch (error)
        {
            if (requestID !== this._requestID)
            {
                return null;
            }

            this._abortController = null;
            this._state = "stopped";
            this._lastError = error;
            this._Notify();
            throw error;
        }
    }

    /**
     * Starts the decoded current song from a time offset.
     *
     * @param {number} offset Offset in seconds.
     */
    _StartBuffer(offset)
    {
        if (!this._context || !this._outputGain || !this._buffer)
        {
            throw new Error(
                "CjsJukebox has no attached decoded song to play",
            );
        }

        this._StopSource();
        const source = this._context.createBufferSource();

        source.buffer = this._buffer;
        source.connect(this._outputGain);
        source.onended = () =>
        {
            if (this._source !== source)
            {
                return;
            }
            this._source = null;
            source.disconnect?.();
            this._offset = 0;
            void this._Move(1, false).catch(error =>
            {
                this._state = "stopped";
                this._lastError = error;
                this._Notify();
            });
        };

        this._source = source;
        this._offset = Math.max(0, Number(offset) || 0);
        this._startedAt = Number(this._context.currentTime) || 0;
        this._state = "playing";
        source.start(0, this._offset);
        this._Notify();
    }

    /**
     * Moves through the current playlist under the repeat policy.
     *
     * @param {number} step Signed index increment.
     * @param {boolean} explicit Whether the caller requested the move.
     * @returns {Promise<object|null>} Newly selected song, or null at the end.
     */
    _Move(step, explicit)
    {
        if (!this._playlist || this._songIndex < 0)
        {
            return this.Play();
        }
        if (!explicit && this._repeat === "song")
        {
            this._StartBuffer(0);
            return Promise.resolve(this.currentSong);
        }

        const index = this._FindAvailableIndex(
            this._playlist,
            this._songIndex,
            step,
            this._repeat === "playlist" || explicit,
        );

        if (index === -1)
        {
            this.Stop();
            return Promise.resolve(null);
        }
        return this._SelectAndPlay(this._playlist, index);
    }

    /**
     * Finds the next song not known to be unavailable.
     *
     * @param {object} playlist Installed playlist.
     * @param {number} start Starting song index.
     * @param {number} step Signed index increment.
     * @param {boolean} wrap Whether the search may wrap.
     * @returns {number} Available song index, or -1.
     */
    _FindAvailableIndex(playlist, start, step, wrap)
    {
        const length = playlist.songs.length;
        let index = start;

        for (let count = 0; count < length; count++)
        {
            index += step;
            if (index < 0 || index >= length)
            {
                if (!wrap)
                {
                    return -1;
                }
                index = (index + length) % length;
            }

            const song = playlist.songs[index];

            if (this._availability.get(
                AvailabilityKey(playlist.id, song.id),
            ) !== false)
            {
                return index;
            }
        }
        return -1;
    }

    /**
     * Resolves a playlist identity from the installed catalog.
     *
     * @param {string} playlistID Playlist identity.
     * @returns {object} Installed playlist.
     */
    _FindPlaylist(playlistID)
    {
        const id = String(playlistID);
        const playlist = this._RequireLibrary().playlists.find(
            candidate => candidate.id === id,
        );

        if (!playlist)
        {
            throw new RangeError(`Unknown music-library playlist ${id}`);
        }
        return playlist;
    }

    /** Returns the installed library or throws when none is installed. */
    _RequireLibrary()
    {
        if (!this._library)
        {
            throw new Error("CjsJukebox has no installed music library");
        }
        return this._library;
    }

    /** Aborts and invalidates the current track-acquisition request. */
    _CancelPending()
    {
        this._requestID++;
        this._abortController?.abort();
        this._abortController = null;
    }

    /** Stops and disconnects the current browser source node. */
    _StopSource()
    {
        const source = this._source;

        if (!source)
        {
            return;
        }
        this._source = null;
        source.onended = null;
        try
        {
            source.stop();
        }
        catch
        {
            // A source that has already ended is still safe to disconnect.
        }
        source.disconnect?.();
    }

    /** Sends the current stable snapshot to the optional state observer. */
    _Notify()
    {
        if (!this._onChange)
        {
            return;
        }
        this._onChange(this.GetStatus());
    }
}

async function DecodeTrack(context, loaded)
{
    if (loaded
        && Number.isFinite(loaded.duration)
        && typeof loaded !== "string")
    {
        return loaded;
    }

    const value = loaded?.bytes ?? loaded;
    let bytes;

    if (value instanceof ArrayBuffer)
    {
        bytes = value.slice(0);
    }
    else if (ArrayBuffer.isView(value))
    {
        bytes = value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
        );
    }
    else
    {
        throw new TypeError(
            "CjsJukebox track loader must return audio bytes or an AudioBuffer",
        );
    }

    return context.decodeAudioData(bytes);
}

function NormalizeIndex(value, length)
{
    const index = Number(value);

    if (!Number.isSafeInteger(index) || index < 0 || index >= length)
    {
        throw new RangeError(
            `Music-library song index ${value} is outside 0..${length - 1}`,
        );
    }
    return index;
}

function AvailabilityKey(playlistID, songID)
{
    return `${playlistID}\0${songID}`;
}

function SetAudioParam(param, value, context)
{
    if (!param)
    {
        return;
    }
    if (typeof param.setValueAtTime === "function")
    {
        param.setValueAtTime(value, Number(context?.currentTime) || 0);
    }
    else
    {
        param.value = value;
    }
}
