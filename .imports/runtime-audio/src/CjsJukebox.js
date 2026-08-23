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
 */
export class CjsJukebox
{
    #context = null;

    #destination = null;

    #library = null;

    #loadTrack = null;

    #isTrackAvailable = null;

    #availability = new Map();

    #availabilityRequestID = 0;

    #availabilityAbortController = null;

    #onChange = null;

    #outputGain = null;

    #playlist = null;

    #songIndex = -1;

    #source = null;

    #buffer = null;

    #offset = 0;

    #startedAt = 0;

    #state = "stopped";

    #volume = 1;

    #repeat = "none";

    #requestID = 0;

    #abortController = null;

    #lastError = null;

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
        return this.#library;
    }

    /** Returns the selected playlist, or null before a selection. */
    get currentPlaylist()
    {
        return this.#playlist;
    }

    /** Returns the selected song, or null before a selection. */
    get currentSong()
    {
        return this.#playlist?.songs[this.#songIndex] ?? null;
    }

    /** Returns stopped, loading, playing, or paused. */
    get state()
    {
        return this.#state;
    }

    /** Returns the current zero-based playlist position. */
    get songIndex()
    {
        return this.#songIndex;
    }

    /** Returns the current output level in the inclusive 0..1 range. */
    get volume()
    {
        return this.#volume;
    }

    /** Returns none, playlist, or song. */
    get repeat()
    {
        return this.#repeat;
    }

    /** Returns the most recent asynchronous playback failure. */
    get lastError()
    {
        return this.#lastError;
    }

    /** Installs a detached catalog and clears the previous selection. */
    InstallLibrary(library)
    {
        this.Stop();
        this.#availabilityRequestID++;
        this.#availabilityAbortController?.abort();
        this.#availabilityAbortController = null;
        this.#library = installMusicLibrary(library);
        this.#playlist = null;
        this.#songIndex = -1;
        this.#buffer = null;
        this.#availability.clear();
        this.#lastError = null;
        this.#Notify();
        return this.#library;
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
        this.#loadTrack = loadTrack;
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
        this.#isTrackAvailable = isTrackAvailable;
        this.#availabilityRequestID++;
        this.#availabilityAbortController?.abort();
        this.#availabilityAbortController = null;
        this.#availability.clear();
        return this;
    }

    /**
     * Probes one playlist or the complete catalog through the caller-owned
     * availability function. Probe errors mark a song unavailable.
     */
    async RefreshAvailability(playlistID = null, { signal = null } = {})
    {
        const library = this.#RequireLibrary();
        const playlists = playlistID === null
            ? library.playlists
            : [ this.#FindPlaylist(playlistID) ];

        if (!this.#isTrackAvailable)
        {
            return playlists.flatMap(playlist => this.GetPlaylistSongs(
                playlist.id,
                { includeUnavailable: true },
            ));
        }

        this.#availabilityAbortController?.abort();
        const requestID = ++this.#availabilityRequestID;
        const controller = new AbortController();
        const abort = () => controller.abort(signal?.reason);

        this.#availabilityAbortController = controller;
        signal?.addEventListener?.("abort", abort, { once: true });

        try
        {
            await Promise.all(playlists.flatMap(playlist =>
                playlist.songs.map(async song =>
                {
                    let available = false;

                    try
                    {
                        available = Boolean(await this.#isTrackAvailable(
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

                    if (requestID === this.#availabilityRequestID)
                    {
                        this.#availability.set(
                            AvailabilityKey(playlist.id, song.id),
                            available,
                        );
                    }
                }),
            ));
            ThrowIfAborted(controller.signal);
        }
        finally
        {
            signal?.removeEventListener?.("abort", abort);
            if (requestID === this.#availabilityRequestID)
            {
                this.#availabilityAbortController = null;
            }
        }

        this.#Notify();
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
        const playlist = this.#FindPlaylist(playlistID);

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
            ? this.#RequireLibrary().playlists
            : [ this.#FindPlaylist(playlistID) ];

        for (const playlist of playlists)
        {
            if (!playlist.songs.some(song => song.id === id))
            {
                continue;
            }
            const value = this.#availability.get(
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
        this.#onChange = onChange;
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
        if (this.#context === context
            && this.#destination === destination
            && this.#outputGain)
        {
            return this;
        }

        this.Stop();
        this.#outputGain?.disconnect?.();
        this.#context = context;
        this.#destination = destination;
        this.#outputGain = context.createGain();
        SetAudioParam(this.#outputGain.gain, this.#volume, context);
        this.#outputGain.connect(destination);
        return this;
    }

    /** Stops playback and disconnects from the current browser mix bus. */
    Detach()
    {
        this.Stop();
        this.#outputGain?.disconnect?.();
        this.#outputGain = null;
        this.#destination = null;
        this.#context = null;
    }

    /** Selects a playlist and starts at its requested zero-based index. */
    PlayPlaylist(playlistID, { index = 0 } = {})
    {
        const playlist = this.#FindPlaylist(playlistID);
        const normalizedIndex = NormalizeIndex(index, playlist.songs.length);

        return this.#SelectAndPlay(playlist, normalizedIndex);
    }

    /**
     * Selects a song by id. Supplying playlistID disambiguates duplicated song
     * ids in different playlists.
     */
    PlaySong(songID, { playlistID = null } = {})
    {
        const id = String(songID);
        const playlists = playlistID === null
            ? this.#RequireLibrary().playlists
            : [ this.#FindPlaylist(playlistID) ];

        for (const playlist of playlists)
        {
            const index = playlist.songs.findIndex(song => song.id === id);

            if (index !== -1)
            {
                return this.#SelectAndPlay(playlist, index);
            }
        }

        return Promise.reject(
            new RangeError(`Unknown music-library song ${id}`),
        );
    }

    /** Starts or resumes the current selection, or the first library song. */
    Play()
    {
        if (this.#state === "paused" && this.#buffer)
        {
            this.#StartBuffer(this.#offset);
            return Promise.resolve(this.currentSong);
        }
        if (this.#playlist && this.#songIndex >= 0)
        {
            if (this.#buffer)
            {
                this.#StartBuffer(0);
                return Promise.resolve(this.currentSong);
            }
            return this.#LoadAndPlay();
        }

        const playlist = this.#RequireLibrary().playlists[0];
        const index = this.#FindAvailableIndex(
            playlist,
            -1,
            1,
            false,
        );

        return index === -1
            ? Promise.reject(new Error(
                `Music-library playlist ${playlist.id} has no available songs`,
            ))
            : this.#SelectAndPlay(playlist, index);
    }

    /** Pauses the current buffer while retaining its decoded data. */
    Pause()
    {
        if (this.#state !== "playing" || !this.#source)
        {
            return false;
        }

        const elapsed = Math.max(
            0,
            Number(this.#context?.currentTime) - this.#startedAt,
        );

        this.#offset = Math.min(
            Math.max(0, Number(this.#buffer?.duration) || 0),
            this.#offset + elapsed,
        );
        this.#StopSource();
        this.#state = "paused";
        this.#Notify();
        return true;
    }

    /** Resumes a paused selection without reacquiring it. */
    Resume()
    {
        if (this.#state !== "paused" || !this.#buffer)
        {
            return false;
        }
        this.#StartBuffer(this.#offset);
        return true;
    }

    /** Stops current loading/playback while retaining the selected song. */
    Stop()
    {
        this.#CancelPending();
        this.#StopSource();
        this.#offset = 0;
        if (this.#state !== "stopped")
        {
            this.#state = "stopped";
            this.#Notify();
        }
    }

    /** Advances to the next song under the current repeat policy. */
    Next()
    {
        return this.#Move(1, true);
    }

    /** Returns to the previous song, or restarts after three elapsed seconds. */
    Previous()
    {
        if (this.#state === "playing"
            && Number(this.#context?.currentTime) - this.#startedAt > 3)
        {
            this.#StartBuffer(0);
            return Promise.resolve(this.currentSong);
        }
        return this.#Move(-1, true);
    }

    /** Sets the independent jukebox output level. */
    SetVolume(value)
    {
        const numeric = Number(value);

        if (!Number.isFinite(numeric))
        {
            throw new TypeError("CjsJukebox volume must be finite");
        }
        this.#volume = Math.max(0, Math.min(1, numeric));
        SetAudioParam(
            this.#outputGain?.gain,
            this.#volume,
            this.#context,
        );
        this.#Notify();
        return this.#volume;
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
        this.#repeat = value;
        this.#Notify();
        return value;
    }

    /** Returns a stable, UI-friendly state snapshot. */
    GetStatus()
    {
        return {
            state: this.#state,
            library: this.#library,
            playlist: this.#playlist,
            song: this.currentSong,
            songIndex: this.#songIndex,
            volume: this.#volume,
            repeat: this.#repeat,
            error: this.#lastError,
            availability: this.currentSong
                ? this.GetTrackAvailability(
                    this.currentSong.id,
                    { playlistID: this.#playlist.id },
                )
                : "unknown",
        };
    }

    /** Releases browser nodes and installed catalog references. */
    Dispose()
    {
        this.Detach();
        this.#library = null;
        this.#playlist = null;
        this.#songIndex = -1;
        this.#buffer = null;
        this.#loadTrack = null;
        this.#isTrackAvailable = null;
        this.#availabilityAbortController?.abort();
        this.#availabilityAbortController = null;
        this.#availability.clear();
        this.#onChange = null;
        this.#lastError = null;
    }

    /**
     * Selects an indexed song and begins asynchronous playback.
     *
     * @param {object} playlist Installed playlist.
     * @param {number} index Zero-based song index.
     * @returns {Promise<object|null>} Selected song after playback starts.
     */
    #SelectAndPlay(playlist, index)
    {
        const song = playlist.songs[index];
        const available = this.#availability.get(
            AvailabilityKey(playlist.id, song.id),
        );

        if (available === false)
        {
            return Promise.reject(
                new Error(`Music-library song ${song.id} is unavailable`),
            );
        }

        this.#CancelPending();
        this.#StopSource();
        this.#playlist = playlist;
        this.#songIndex = index;
        this.#buffer = null;
        this.#offset = 0;
        this.#lastError = null;
        return this.#LoadAndPlay();
    }

    /** Acquires, decodes, and starts the currently selected song. */
    async #LoadAndPlay()
    {
        const song = this.currentSong;

        if (!song)
        {
            throw new Error("CjsJukebox has no selected song");
        }
        if (!this.#context || !this.#outputGain)
        {
            throw new Error(
                "CjsJukebox must be attached before playback",
            );
        }
        if (!this.#loadTrack)
        {
            throw new Error("CjsJukebox has no track loader");
        }

        this.#CancelPending();
        const requestID = ++this.#requestID;
        const controller = new AbortController();

        this.#abortController = controller;
        this.#state = "loading";
        this.#Notify();

        try
        {
            const loaded = await this.#loadTrack(song, {
                signal: controller.signal,
                playlist: this.#playlist,
                library: this.#library,
            });
            ThrowIfAborted(controller.signal);
            const buffer = await DecodeTrack(this.#context, loaded);
            ThrowIfAborted(controller.signal);

            if (requestID !== this.#requestID)
            {
                return null;
            }

            this.#abortController = null;
            this.#buffer = buffer;
            this.#offset = 0;
            this.#lastError = null;
            this.#StartBuffer(0);
            return song;
        }
        catch (error)
        {
            if (requestID !== this.#requestID)
            {
                return null;
            }

            this.#abortController = null;
            this.#state = "stopped";
            this.#lastError = error;
            this.#Notify();
            throw error;
        }
    }

    /**
     * Starts the decoded current song from a time offset.
     *
     * @param {number} offset Offset in seconds.
     */
    #StartBuffer(offset)
    {
        if (!this.#context || !this.#outputGain || !this.#buffer)
        {
            throw new Error(
                "CjsJukebox has no attached decoded song to play",
            );
        }

        this.#StopSource();
        const source = this.#context.createBufferSource();

        source.buffer = this.#buffer;
        source.connect(this.#outputGain);
        source.onended = () =>
        {
            if (this.#source !== source)
            {
                return;
            }
            this.#source = null;
            source.disconnect?.();
            this.#offset = 0;
            void this.#Move(1, false).catch(error =>
            {
                this.#state = "stopped";
                this.#lastError = error;
                this.#Notify();
            });
        };

        this.#source = source;
        this.#offset = Math.max(0, Number(offset) || 0);
        this.#startedAt = Number(this.#context.currentTime) || 0;
        this.#state = "playing";
        source.start(0, this.#offset);
        this.#Notify();
    }

    /**
     * Moves through the current playlist under the repeat policy.
     *
     * @param {number} step Signed index increment.
     * @param {boolean} explicit Whether the caller requested the move.
     * @returns {Promise<object|null>} Newly selected song, or null at the end.
     */
    #Move(step, explicit)
    {
        if (!this.#playlist || this.#songIndex < 0)
        {
            return this.Play();
        }
        if (!explicit && this.#repeat === "song")
        {
            this.#StartBuffer(0);
            return Promise.resolve(this.currentSong);
        }

        const index = this.#FindAvailableIndex(
            this.#playlist,
            this.#songIndex,
            step,
            this.#repeat === "playlist" || explicit,
        );

        if (index === -1)
        {
            this.Stop();
            return Promise.resolve(null);
        }
        return this.#SelectAndPlay(this.#playlist, index);
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
    #FindAvailableIndex(playlist, start, step, wrap)
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

            if (this.#availability.get(
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
    #FindPlaylist(playlistID)
    {
        const id = String(playlistID);
        const playlist = this.#RequireLibrary().playlists.find(
            candidate => candidate.id === id,
        );

        if (!playlist)
        {
            throw new RangeError(`Unknown music-library playlist ${id}`);
        }
        return playlist;
    }

    /** Returns the installed library or throws when none is installed. */
    #RequireLibrary()
    {
        if (!this.#library)
        {
            throw new Error("CjsJukebox has no installed music library");
        }
        return this.#library;
    }

    /** Aborts and invalidates the current track-acquisition request. */
    #CancelPending()
    {
        this.#requestID++;
        this.#abortController?.abort();
        this.#abortController = null;
    }

    /** Stops and disconnects the current browser source node. */
    #StopSource()
    {
        const source = this.#source;

        if (!source)
        {
            return;
        }
        this.#source = null;
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
    #Notify()
    {
        if (!this.#onChange)
        {
            return;
        }
        this.#onChange(this.GetStatus());
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

function ThrowIfAborted(signal)
{
    if (!signal?.aborted)
    {
        return;
    }
    if (signal.reason instanceof Error)
    {
        throw signal.reason;
    }
    throw new DOMException("The operation was aborted", "AbortError");
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
