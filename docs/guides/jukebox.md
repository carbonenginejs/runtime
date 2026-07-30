# Use the optional jukebox

Status: Experimental

Scope: `@carbonenginejs/runtime-audio`

Audience: Browser application authors

Summary: Supplies a neutral track catalog and caller-owned acquisition to `CjsJukebox`.

## Separate music systems

Runtime-audio exposes two deliberately independent music paths:

- `CjsMusicEngine` interprets authored Wwise events, containers, switches,
  playlists, segments, and transitions from the complete audio document.
- `CjsJukebox` plays named tracks from an optional neutral music-library
  catalog.

The jukebox does not route synthetic Wwise events and does not replace the
authored engine. An application may mix both or make them mutually exclusive
in its UI.

## Catalog

The current JSON-compatible schema is:

```js
const musicLibrary = {
    schema: "carbonenginejs.musicLibrary",
    schemaVersion: 1,
    name: "Example soundtrack",
    author: "Example publisher",
    version: "1.0.0",
    playlists: [
        {
            id: "main",
            name: "Main playlist",
            author: "Example curator",
            version: "1.0.0",
            songs: [
                {
                    id: "opening",
                    name: "Opening",
                    url: "https://audio.example/opening.ogg",
                    path: "optional/local/cache/opening.ogg",
                    durationMs: 180000
                }
            ]
        }
    ]
};
```

Each song must provide `url`, `path`, or both. They are caller-owned
acquisition hints: runtime-audio does not resolve or fetch either value.

## Manager integration

Pass the optional catalog, loader, and availability probe when constructing
`CjsAudioMan`:

```js
const audio = new CjsAudioMan(audioLibrary, {
    mediaProvider,
    musicLibrary,
    async loadMusicTrack(song, { signal })
    {
        const response = await fetch(song.url ?? song.path, { signal });

        if (!response.ok)
        {
            throw new Error(`Track unavailable: ${response.status}`);
        }
        return response.arrayBuffer();
    },
    async isMusicTrackAvailable(song, { signal })
    {
        const response = await fetch(song.url ?? song.path, {
            method: "HEAD",
            signal
        });
        return response.ok;
    }
});

audio.Enable();
await audio.jukebox.RefreshAvailability("main");
const visibleSongs = audio.jukebox.GetPlaylistSongs("main", {
    includeUnavailable: false
});
await audio.jukebox.PlayPlaylist("main");
audio.jukebox.Pause();
audio.jukebox.Resume();
await audio.jukebox.Next();
```

The loader may return an `AudioBuffer`, `ArrayBuffer`, typed array, or
`{ bytes }`. Byte results are decoded with the manager's browser
`AudioContext`. Loading is cancellation-safe: replacing or stopping a pending
selection cannot revive stale playback.

The availability probe is also caller-owned because a URL, API, cache, or
permission may change independently of the catalog. `GetPlaylistSongs()` lets
a UI hide known-unavailable songs or retain and disable them.

Tools-core may expose a configured catalog through
`/{target}/{build}/audio/music/library`. That response is already an
installable music library, omits unavailable songs, and points each song URL
at the corresponding read-only tools-core byte endpoint.

The catalog, loader, and availability checker may instead be supplied later
through `InstallMusicLibrary()`, `SetMusicTrackLoader()`, and
`SetMusicTrackAvailabilityChecker()`. `CjsJukebox` is also a public standalone
class for hosts that own their Web Audio composition.

## Lifecycle and volume

The manager attaches the jukebox to its master bus during `Enable()`.
`Disable()`, `StopAllPlayingSounds()`, audio-library replacement, and
`Dispose()` stop it. The global `menu_main_music_level` RTPC also sets its
independent output gain.

Repeat modes are `none`, `playlist`, and `song`. `GetStatus()` returns a
UI-friendly snapshot containing the current library, playlist, song, index,
state, availability, repeat mode, volume, and last asynchronous error.

## Related documentation

- [Browser playback](browser-playback.md)
- [Architecture and boundaries](../architecture.md)
- [API reference](../reference/api.md)
