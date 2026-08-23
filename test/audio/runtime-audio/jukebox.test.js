import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsAudioMan,
    CjsJukebox,
} from "../../../npm/dist/audio/index.js";
import {
    installMusicLibrary,
    validateMusicLibrary,
} from "../../../npm/dist/audio/library/index.js";

function CreateMusicLibrary()
{
    return {
        schema: "carbonenginejs.musicLibrary",
        schemaVersion: 1,
        name: "Test music",
        author: "Test author",
        version: "1",
        playlists: [
            {
                id: "main",
                name: "Main",
                author: "Test author",
                version: "1",
                songs: [
                    {
                        id: "one",
                        name: "One",
                        path: "/music/one.ogg",
                        durationMs: 4000,
                    },
                    {
                        id: "two",
                        name: "Two",
                        path: "/music/two.ogg",
                        durationMs: 5000,
                    },
                ],
            },
        ],
    };
}

function CreateAudioLibrary()
{
    return {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {},
            SoundBanks: {},
            WemFileIDs: {},
        },
        media: {},
        banks: {},
    };
}

function FakeContext()
{
    const context = {
        currentTime: 0,
        destination: { kind: "destination" },
        gains: [],
        sources: [],
        decoded: [],
        listener: {},
        createGain()
        {
            const gain = {
                gain: {
                    value: 1,
                    setValueAtTime(value)
                    {
                        gain.gain.value = value;
                    },
                },
                connectedTo: null,
                connect(destination)
                {
                    gain.connectedTo = destination;
                },
                disconnect()
                {
                    gain.connectedTo = null;
                },
            };

            context.gains.push(gain);
            return gain;
        },
        createBufferSource()
        {
            const source = {
                buffer: null,
                connectedTo: null,
                onended: null,
                offset: null,
                stopped: false,
                connect(destination)
                {
                    source.connectedTo = destination;
                },
                disconnect()
                {
                    source.connectedTo = null;
                },
                start(when, offset)
                {
                    source.offset = offset;
                },
                stop()
                {
                    source.stopped = true;
                    source.onended?.();
                },
                finish()
                {
                    source.onended?.();
                },
            };

            context.sources.push(source);
            return source;
        },
        decodeAudioData(bytes)
        {
            context.decoded.push(new Uint8Array(bytes));
            return Promise.resolve({ duration: 4, decoded: true });
        },
        createPanner()
        {
            return {
                connect() {},
                disconnect() {},
            };
        },
    };

    return context;
}

test("music-library installation validates, detaches, and freezes catalogs", () =>
{
    const source = CreateMusicLibrary();
    const installed = installMusicLibrary(source);

    assert.equal(validateMusicLibrary(source), true);
    assert.notEqual(installed, source);
    assert.equal(Object.isFrozen(installed), true);
    assert.equal(Object.isFrozen(installed.playlists[0].songs[0]), true);

    source.playlists[0].songs[0].name = "Changed";
    assert.equal(installed.playlists[0].songs[0].name, "One");

    assert.throws(
        () => validateMusicLibrary({
            ...CreateMusicLibrary(),
            playlists: [],
        }),
        /non-empty array/,
    );
});

test("CjsJukebox plays supplied bytes, pauses, resumes, and advances", async () =>
{
    const context = FakeContext();
    const loaded = [];
    const states = [];
    const jukebox = new CjsJukebox({
        library: CreateMusicLibrary(),
        loadTrack(song)
        {
            loaded.push(song.id);
            return new Uint8Array([ 1, 2, 3 ]);
        },
        onChange(status)
        {
            states.push(status.state);
        },
    });

    jukebox.Attach(context);
    assert.equal(
        (await jukebox.PlayPlaylist("main")).id,
        "one",
    );
    assert.equal(jukebox.state, "playing");
    assert.deepEqual(loaded, [ "one" ]);
    assert.deepEqual([ ...context.decoded[0] ], [ 1, 2, 3 ]);

    context.currentTime = 1.25;
    assert.equal(jukebox.Pause(), true);
    assert.equal(jukebox.state, "paused");
    assert.equal(jukebox.Resume(), true);
    assert.equal(context.sources.at(-1).offset, 1.25);

    assert.equal((await jukebox.Next()).id, "two");
    assert.equal(jukebox.currentSong.name, "Two");
    assert.deepEqual(loaded, [ "one", "two" ]);
    assert.equal(states.includes("loading"), true);
    assert.equal(states.includes("paused"), true);
    jukebox.Dispose();
});

test("a replaced asynchronous jukebox load cannot revive stale playback", async () =>
{
    const context = FakeContext();
    const pending = new Map();
    const jukebox = new CjsJukebox({
        library: CreateMusicLibrary(),
        loadTrack(song)
        {
            return new Promise(resolve => pending.set(song.id, resolve));
        },
    });

    jukebox.Attach(context);
    const first = jukebox.PlaySong("one");
    const second = jukebox.PlaySong("two");

    pending.get("one")(new Uint8Array([ 1 ]));
    assert.equal(await first, null);
    assert.equal(context.sources.length, 0);

    pending.get("two")(new Uint8Array([ 2 ]));
    assert.equal((await second).id, "two");
    assert.equal(context.sources.length, 1);
    assert.equal(jukebox.currentSong.id, "two");
});

test("caller-owned availability can hide or disable unreachable URLs", async () =>
{
    const context = FakeContext();
    const library = CreateMusicLibrary();

    delete library.playlists[0].songs[1].path;
    library.playlists[0].songs[1].url = "https://example.invalid/two.ogg";

    const jukebox = new CjsJukebox({
        library,
        loadTrack: () => ({ duration: 4 }),
        isTrackAvailable: song => song.id === "two",
    });

    jukebox.Attach(context);
    await jukebox.RefreshAvailability("main");

    assert.equal(
        jukebox.GetTrackAvailability("one", { playlistID: "main" }),
        "unavailable",
    );
    assert.equal(
        jukebox.GetTrackAvailability("two", { playlistID: "main" }),
        "available",
    );
    assert.deepEqual(
        jukebox.GetPlaylistSongs(
            "main",
            { includeUnavailable: false },
        ).map(song => song.id),
        [ "two" ],
    );
    await assert.rejects(
        jukebox.PlaySong("one", { playlistID: "main" }),
        /unavailable/,
    );
    assert.equal((await jukebox.Play()).id, "two");
});

test("CjsAudioMan owns optional jukebox attachment and lifecycle", async () =>
{
    const context = FakeContext();
    const man = new CjsAudioMan(CreateAudioLibrary(), {
        createContext: () => context,
        musicLibrary: CreateMusicLibrary(),
        loadMusicTrack: () => ({ duration: 4 }),
    });

    assert.ok(man.jukebox instanceof CjsJukebox);
    assert.equal(man.Enable(), true);
    assert.equal((await man.jukebox.Play()).id, "one");

    man.SetGlobalRTPC("menu_main_music_level", 0.25);
    assert.equal(man.jukebox.volume, 0.25);
    man.StopAllPlayingSounds();
    assert.equal(man.jukebox.state, "stopped");

    await man.jukebox.Play();
    man.Disable();
    assert.equal(man.jukebox.state, "stopped");
    man.Dispose();
    assert.equal(man.jukebox, null);
});
