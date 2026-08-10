import assert from "node:assert/strict";
import test from "node:test";

import { CjsAudioMan } from "../npm/dist/index.js";

function CreateDocument({ direct = null, embedded = null } = {})
{
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {},
            SoundBanks: {},
            WemFileIDs: {},
        },
        media: direct ? { "777": direct } : {},
        banks: {},
    };

    if (embedded)
    {
        library.banks["524:0"] = {
            sourceID: "524:0",
            bankID: "524",
            languageID: "0",
            resPath: "res:/audio/524.bnk",
            byteLength: 12,
        };
        library.embeddedMedia = {
            "777": {
                sourceID: "embedded:777:524:0",
                bank: "524:0",
                offset: 4,
                byteLength: 4,
                mediaType: "ogg",
            },
        };
    }

    return library;
}

function FakeParam(value = 0)
{
    return {
        value,
        linearRampToValueAtTime() {},
    };
}

function FakeContext(log)
{
    return {
        currentTime: 0,
        destination: {},
        listener: {
            positionX: FakeParam(),
            positionY: FakeParam(),
            positionZ: FakeParam(),
            forwardX: FakeParam(),
            forwardY: FakeParam(),
            forwardZ: FakeParam(),
            upX: FakeParam(),
            upY: FakeParam(),
            upZ: FakeParam(),
        },
        createGain()
        {
            return {
                gain: FakeParam(1),
                connect() {},
                disconnect() {},
            };
        },
        createPanner()
        {
            return {
                positionX: FakeParam(),
                positionY: FakeParam(),
                positionZ: FakeParam(),
                connect() {},
                disconnect() {},
            };
        },
        decodeAudioData(bytes)
        {
            const decoded = {
                byteLength: bytes.byteLength,
                sampleRate: 48000,
                getChannelData()
                {
                    return new Float32Array(0);
                },
            };

            log.push([ "decode", new Uint8Array(bytes) ]);
            return Promise.resolve(decoded);
        },
        createBuffer(channels, sampleCount, sampleRate)
        {
            const data = Array.from(
                { length: channels },
                () => new Float32Array(sampleCount),
            );

            return {
                channels,
                sampleCount,
                sampleRate,
                copyToChannel(values, channel)
                {
                    data[channel].set(values);
                },
                getChannelData(channel)
                {
                    return data[channel];
                },
            };
        },
    };
}

function PlaybackContext(log)
{
    const context = FakeContext(log);
    const createGain = context.createGain.bind(context);

    context.gains = [];
    context.createGain = () =>
    {
        const gain = createGain();
        const connect = gain.connect.bind(gain);

        gain.connectedTo = null;
        gain.connect = target =>
        {
            gain.connectedTo = target;
            return connect(target);
        };
        context.gains.push(gain);
        return gain;
    };
    context.sources = [];
    context.createBufferSource = () =>
    {
        const source = {
            buffer: null,
            loop: false,
            playbackRate: FakeParam(1),
            onended: null,
            started: false,
            stoppedAt: null,
            connect() {},
            disconnect() {},
            start(time, offset)
            {
                source.started = true;
                source.startedAt = time;
                source.offset = offset;
            },
            stop(time)
            {
                source.stoppedAt = time ?? context.currentTime;
                source.onended?.();
            },
        };

        context.sources.push(source);
        return source;
    };
    return context;
}

function Deferred()
{
    let resolve;
    let reject;
    const promise = new Promise((next, fail) =>
    {
        resolve = next;
        reject = fail;
    });

    return { promise, reject, resolve };
}

test("CjsAudioMan validates shared Bus approximation policies", () =>
{
    assert.throws(
        () => new CjsAudioMan(null, { wwiseModulation: "approximate" }),
        /Unsupported Wwise modulation realization mode/u,
    );
    assert.throws(
        () => new CjsAudioMan(null, { wwiseDistortion: "approximate" }),
        /Unsupported Wwise distortion realization mode/u,
    );
    assert.throws(
        () => new CjsAudioMan(null, { wwiseMeterFeedback: "omit" }),
        /Unsupported Wwise Meter feedback mode/u,
    );
    assert.throws(
        () => new CjsAudioMan(null, { wwiseVoiceLimits: "approximate" }),
        /Unsupported Wwise voice-limit mode/u,
    );
    assert.doesNotThrow(() => new CjsAudioMan(null, {
        wwiseDistortion: "approximate-web-audio",
        wwiseModulation: "approximate-web-audio",
        wwiseMeterFeedback: "omit-telemetry",
        wwiseVoiceLimits: "ignore",
    }));
});

test("CjsAudioMan realizes timed silence without media I/O or long PCM", async () =>
{
    const context = PlaybackContext([]);
    const createBuffer = context.createBuffer.bind(context);
    let createdBuffers = 0;
    let reads = 0;

    context.createBuffer = (...args) =>
    {
        createdBuffers++;
        return createBuffer(...args);
    };
    const library = CreateDocument();

    library.metadata.Events.authored_wait = {
        eventID: 42,
        eventsStoppedBy: [],
        is2D: 1,
        isLoop: 0,
        isVital: 0,
        maxRadiusAttenuation: 0,
        soundbanks: [ "ships.bnk" ],
    };
    library.metadata.SoundBanks["ships.bnk"] = {
        EssentialSoundBank: 0,
    };
    library.sfx = {
        schemaVersion: 2,
        events: {
            authored_wait: [ { nodeId: "1" } ],
        },
        nodes: {
            "1": {
                type: "timed-silence",
                durationMs: 6500,
            },
        },
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read()
            {
                reads++;
                throw new Error("timed silence must not acquire media");
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);
    const emitter = man.CreateEmitter();

    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    emitter.Wake();
    assert.ok(emitter.SendEvent("authored_wait") > 0);
    assert.ok(emitter.SendEvent("authored_wait") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(reads, 0);
    assert.equal(createdBuffers, 1, "one one-frame carrier is cached");
    assert.equal(context.sources.length, 2);
    assert.equal(context.sources[0].buffer, context.sources[1].buffer);
    assert.equal(context.sources.every(source => source.loop), true);
    assert.equal(context.sources[0].buffer.sampleCount, 1);
    assert.equal(context.sources[0].stoppedAt, 6500 / 1000 + 128 / 48000);
    man.Dispose();
});

test("CjsAudioMan installs State ID/name aliases through its backend", () =>
{
    const library = CreateDocument();
    const context = PlaybackContext([]);

    library.sfx = {
        schemaVersion: 2,
        events: {},
        nodes: {},
        stateTransitions: [ {
            groupId: "10",
            group: "combat",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "11", state: "calm" },
                { stateId: "12", state: "danger" },
            ],
            transitions: [],
        } ],
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
    });

    assert.equal(man.Enable(), true);
    man.system.backend.SetGlobalState("10", "11");
    assert.equal(man.system.backend.GetGlobalState("combat"), "calm");
    man.Dispose();
});

test("CjsAudioMan installs self-contained Bus State transition aliases", () =>
{
    const library = CreateDocument();
    const context = PlaybackContext([]);

    library.busStates = {
        schemaVersion: 1,
        property: "bus-volume",
        accumulation: "additive",
        unit: "db",
        stateTransitions: [ {
            groupId: "10",
            group: "video_overlay",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "11", state: "off" },
                { stateId: "12", state: "on" },
            ],
            transitions: [],
        } ],
        buses: {
            "500": [ {
                groupId: "10",
                group: "video_overlay",
                syncType: 1,
                effectiveSyncType: 0,
                states: [ {
                    stateId: "12",
                    state: "on",
                    gainDb: -96,
                } ],
            } ],
        },
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
    });

    assert.equal(man.Enable(), true);
    man.system.backend.SetGlobalState("10", "12");
    assert.equal(man.system.backend.GetGlobalState("video_overlay"), "on");
    man.Dispose();
});

test("conflicting Bus State transitions preserve the installed system", () =>
{
    const original = CreateDocument();
    const replacement = CreateDocument();
    const man = new CjsAudioMan(original);
    const installed = man.library;
    const system = man.system;

    replacement.sfx = {
        schemaVersion: 2,
        events: {},
        nodes: {},
        stateTransitions: [ {
            groupId: "10",
            group: "combat",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "11", state: "off" },
                { stateId: "12", state: "on" },
            ],
            transitions: [],
        } ],
    };
    replacement.busStates = {
        schemaVersion: 1,
        property: "bus-volume",
        accumulation: "additive",
        unit: "db",
        stateTransitions: [ {
            groupId: "10",
            group: "video_overlay",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "11", state: "off" },
                { stateId: "12", state: "on" },
            ],
            transitions: [],
        } ],
        buses: {
            "500": [ {
                groupId: "10",
                group: "video_overlay",
                syncType: 0,
                effectiveSyncType: 0,
                states: [ {
                    stateId: "12",
                    state: "on",
                    gainDb: -6,
                } ],
            } ],
        },
    };

    assert.throws(
        () => man.InstallLibrary(replacement),
        /Conflicting audio State transition group 10/u,
    );
    assert.equal(man.library, installed);
    assert.equal(man.system, system);
    man.Dispose();
});

test("State transition catalog aliases merge case-insensitively", () =>
{
    const library = CreateDocument();

    library.sfx = {
        schemaVersion: 2,
        events: {},
        nodes: {},
        stateTransitions: [ {
            groupId: "10",
            group: "video_overlay",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "11", state: "off" },
                { stateId: "12", state: "on" },
            ],
            transitions: [],
        } ],
    };
    library.busStates = {
        schemaVersion: 1,
        property: "bus-volume",
        accumulation: "additive",
        unit: "db",
        stateTransitions: [ {
            groupId: "10",
            group: "Video_Overlay",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "11", state: "OFF" },
                { stateId: "12", state: "ON" },
            ],
            transitions: [],
        } ],
        buses: {
            "500": [ {
                groupId: "10",
                group: "Video_Overlay",
                syncType: 0,
                effectiveSyncType: 0,
                states: [ {
                    stateId: "12",
                    state: "ON",
                    gainDb: -6,
                } ],
            } ],
        },
    };

    const man = new CjsAudioMan(library);

    assert.ok(man.system);
    man.Dispose();
});

test("CjsAudioMan installs one immutable document and reads individual media", async () =>
{
    const log = [];
    const reads = [];
    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "prepared:777",
            resPath: "res:/audio/777.ogg",
            mediaType: "ogg",
            byteLength: 4,
        },
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read(source, context)
            {
                reads.push([ source, context ]);
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(Object.isFrozen(man.library), true);
    assert.equal(man.Enable(), true);

    const first = man.LoadMedia(777);
    const second = man.LoadMedia("777");

    assert.equal(await first, await second, "concurrent decodes are deduplicated");
    assert.equal(reads.length, 1);
    assert.equal(reads[0][1].kind, "media");
    assert.deepEqual([ ...log[0][1] ], [ 1, 2, 3, 4 ]);
    assert.equal(man.ReleaseMedia(777), 1);
    man.Dispose();
});

test("shared media acquisition survives one cancelled subscriber", async () =>
{
    const log = [];
    const read = Deferred();
    let providerSignal = null;
    let reads = 0;
    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "prepared:777",
            resPath: "res:/audio/777.ogg",
            mediaType: "ogg",
            byteLength: 4,
        },
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read(source, context)
            {
                reads++;
                providerSignal = context.signal;
                return read.promise;
            },
        },
    });
    const firstController = new AbortController();
    const secondController = new AbortController();

    assert.equal(man.Enable(), true);
    const first = man.LoadMedia(777, {
        signal: firstController.signal,
    });
    const second = man.LoadMedia(777, {
        signal: secondController.signal,
    });

    await new Promise(resolve => setImmediate(resolve));
    firstController.abort();
    await assert.rejects(first, { name: "AbortError" });
    assert.equal(
        providerSignal.aborted,
        false,
        "one subscriber cannot cancel a shared provider read",
    );

    read.resolve(new Uint8Array([ 1, 2, 3, 4 ]));
    assert.equal((await second).byteLength, 4);
    assert.equal(reads, 1);
    assert.equal(providerSignal.aborted, false);
    man.Dispose();
});

test("shared media acquisition aborts its provider after the final lease ends", async () =>
{
    for (const order of [ [ 0, 1 ], [ 1, 0 ] ])
    {
        const log = [];
        let providerSignal = null;
        const man = new CjsAudioMan(CreateDocument({
            direct: {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
                byteLength: 4,
            },
        }), {
            createContext: () => FakeContext(log),
            mediaProvider: {
                Read(source, context)
                {
                    providerSignal = context.signal;
                    return new Promise((resolve, reject) =>
                    {
                        context.signal.addEventListener("abort", () =>
                        {
                            reject(context.signal.reason);
                        }, { once: true });
                    });
                },
            },
        });
        const controllers = [
            new AbortController(),
            new AbortController(),
        ];

        assert.equal(man.Enable(), true);
        const loads = controllers.map(controller =>
            man.LoadMedia(777, { signal: controller.signal }));

        await new Promise(resolve => setImmediate(resolve));
        controllers[order[0]].abort();
        await assert.rejects(loads[order[0]], { name: "AbortError" });
        assert.equal(
            providerSignal.aborted,
            false,
            `the first cancellation in order ${order.join(",")} keeps the read alive`,
        );

        controllers[order[1]].abort();
        await assert.rejects(loads[order[1]], { name: "AbortError" });
        assert.equal(
            providerSignal.aborted,
            true,
            `the final cancellation in order ${order.join(",")} aborts the read`,
        );
        man.Dispose();
    }
});

test("an orphaned cancelled acquisition is evicted before its provider settles", async () =>
{
    const log = [];
    const abandoned = Deferred();
    let reads = 0;
    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "prepared:777",
            resPath: "res:/audio/777.ogg",
            mediaType: "ogg",
            byteLength: 4,
        },
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read()
            {
                reads++;
                return reads === 1
                    ? abandoned.promise
                    : new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });
    const controller = new AbortController();

    assert.equal(man.Enable(), true);
    const cancelled = man.LoadMedia(777, {
        signal: controller.signal,
    });

    await new Promise(resolve => setImmediate(resolve));
    controller.abort();
    await assert.rejects(cancelled, { name: "AbortError" });

    const replacement = await man.LoadMedia(777);

    assert.equal(
        replacement.byteLength,
        4,
        "a new caller does not inherit the abandoned operation",
    );
    assert.equal(reads, 2);

    abandoned.resolve(new Uint8Array([ 9, 9, 9, 9 ]));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(
        await man.LoadMedia(777),
        replacement,
        "the late abandoned result cannot replace the retained retry",
    );
    assert.equal(reads, 2);
    man.Dispose();
});

test("an orphaned whole-bank read cannot poison its immediate retry", async () =>
{
    const log = [];
    const abandoned = Deferred();
    let reads = 0;
    const man = new CjsAudioMan(CreateDocument({ embedded: true }), {
        createContext: () => FakeContext(log),
        delivery: "whole",
        mediaProvider: {
            Read()
            {
                reads++;
                return reads === 1
                    ? abandoned.promise
                    : new Uint8Array([
                        0, 0, 0, 0,
                        1, 2, 3, 4,
                        0, 0, 0, 0,
                    ]);
            },
        },
    });
    const controller = new AbortController();

    assert.equal(man.Enable(), true);
    const cancelled = man.LoadMedia(777, {
        signal: controller.signal,
    });

    await new Promise(resolve => setImmediate(resolve));
    controller.abort();
    await assert.rejects(cancelled, { name: "AbortError" });

    const replacement = await man.LoadMedia(777);

    assert.equal(replacement.byteLength, 4);
    assert.equal(reads, 2);

    abandoned.resolve(new Uint8Array(12));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(await man.LoadMedia(777), replacement);
    assert.equal(reads, 2);
    man.Dispose();
});

test("whole-bank delivery shares cancellation leases across embedded media", async () =>
{
    const log = [];
    const library = CreateDocument({ embedded: true });

    library.embeddedMedia["778"] = {
        sourceID: "embedded:778:524:0",
        bank: "524:0",
        offset: 8,
        byteLength: 4,
        mediaType: "ogg",
    };

    let providerSignal = null;
    let reads = 0;
    const man = new CjsAudioMan(library, {
        createContext: () => FakeContext(log),
        delivery: "whole",
        mediaProvider: {
            Read(source, context)
            {
                reads++;
                providerSignal = context.signal;
                return new Promise((resolve, reject) =>
                {
                    context.signal.addEventListener("abort", () =>
                    {
                        reject(context.signal.reason);
                    }, { once: true });
                });
            },
        },
    });
    const firstController = new AbortController();
    const secondController = new AbortController();

    assert.equal(man.Enable(), true);
    const first = man.LoadMedia(777, {
        signal: firstController.signal,
    });
    const second = man.LoadMedia(778, {
        signal: secondController.signal,
    });

    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reads, 1, "both embedded members share one whole-bank read");

    firstController.abort();
    await assert.rejects(first, { name: "AbortError" });
    assert.equal(
        providerSignal.aborted,
        false,
        "the sibling embedded-media lease keeps the bank read alive",
    );

    secondController.abort();
    await assert.rejects(second, { name: "AbortError" });
    assert.equal(providerSignal.aborted, true);
    man.Dispose();
});

test("cancellation during decode discards its late result and permits retry", async () =>
{
    const log = [];
    const firstDecode = Deferred();
    const context = FakeContext(log);
    const decoded = {
        byteLength: 4,
        sampleRate: 48000,
        getChannelData()
        {
            return new Float32Array(0);
        },
    };
    let decodeCalls = 0;
    let reads = 0;

    context.decodeAudioData = () =>
    {
        decodeCalls++;
        return decodeCalls === 1
            ? firstDecode.promise
            : Promise.resolve(decoded);
    };

    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "prepared:777",
            resPath: "res:/audio/777.ogg",
            mediaType: "ogg",
            byteLength: 4,
        },
    }), {
        createContext: () => context,
        mediaProvider: {
            Read()
            {
                reads++;
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });
    const controller = new AbortController();

    assert.equal(man.Enable(), true);
    const cancelled = man.LoadMedia(777, {
        signal: controller.signal,
    });

    await new Promise(resolve => setImmediate(resolve));
    assert.equal(decodeCalls, 1);
    controller.abort();
    await assert.rejects(cancelled, { name: "AbortError" });

    firstDecode.resolve(decoded);
    await new Promise(resolve => setImmediate(resolve));
    await assert.rejects(
        Promise.resolve().then(() => cancelled),
        { name: "AbortError" },
    );

    assert.equal(await man.LoadMedia(777), decoded);
    assert.equal(reads, 2, "the aborted late decode was not retained");
    man.Dispose();
});

test("manager invalidation aborts direct pending media acquisitions", async () =>
{
    for (const operation of [ "dispose", "provider", "library" ])
    {
        const log = [];
        let providerSignal = null;
        const library = CreateDocument({
            direct: {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
                byteLength: 4,
            },
        });
        const man = new CjsAudioMan(library, {
            createContext: () => FakeContext(log),
            mediaProvider: {
                Read(source, context)
                {
                    providerSignal = context.signal;
                    return new Promise(() => {});
                },
            },
        });

        assert.equal(man.Enable(), true);
        const pending = man.LoadMedia(777);

        await new Promise(resolve => setImmediate(resolve));
        assert.equal(providerSignal.aborted, false);

        if (operation === "dispose")
        {
            man.Dispose();
        }
        else
        {
            man.Disable();
            if (operation === "provider")
            {
                man.SetMediaProvider({
                    Read()
                    {
                        return new Uint8Array([ 1, 2, 3, 4 ]);
                    },
                });
            }
            else
            {
                man.InstallLibrary(library);
            }
        }

        assert.equal(
            providerSignal.aborted,
            true,
            `${operation} aborts the obsolete provider operation`,
        );
        await assert.rejects(pending, { name: "AbortError" });
        man.Dispose();
    }
});

test("stale failed media reads cannot evict a newer decoded operation", async () =>
{
    const log = [];
    const stale = Deferred();
    let reads = 0;
    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "prepared:777",
            resPath: "res:/audio/777.ogg",
            mediaType: "ogg",
            byteLength: 4,
        },
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read()
            {
                reads++;
                return reads === 1
                    ? stale.promise
                    : new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(man.Enable(), true);
    const superseded = man.LoadMedia(777);

    assert.equal(man.ReleaseMedia(777), 1);
    const replacementBuffer = await man.LoadMedia(777);

    stale.reject(new Error("superseded read failed"));
    await assert.rejects(superseded, /superseded read failed/u);
    assert.equal(
        await man.LoadMedia(777),
        replacementBuffer,
        "the current decoded result remains retained",
    );
    assert.equal(reads, 2, "the stale rejection did not trigger a third read");
    man.Dispose();
});

test("stale failed whole-bank reads cannot evict replacement bank bytes", async () =>
{
    const log = [];
    const stale = Deferred();
    let reads = 0;
    const man = new CjsAudioMan(CreateDocument({
        embedded: true,
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read()
            {
                reads++;
                return reads === 1
                    ? stale.promise
                    : new Uint8Array(12);
            },
        },
    });

    assert.equal(man.Enable(), true);
    const superseded = man.LoadMedia(777);

    assert.equal(man.ClearMedia(), 1);
    assert.equal(man.ClearSourceData(), 1);
    await man.LoadMedia(777);

    stale.reject(new Error("superseded bank read failed"));
    await assert.rejects(superseded, /superseded bank read failed/u);

    assert.equal(man.ReleaseMedia(777), 1);
    await man.LoadMedia(777);
    assert.equal(
        reads,
        2,
        "the replacement whole-bank bytes remain retained",
    );
    man.Dispose();
});

test("CjsAudioMan owns and realizes the fixed Carbon listener", () =>
{
    const log = [];
    const context = PlaybackContext(log);
    const man = new CjsAudioMan(CreateDocument(), {
        createContext: () => context,
    });

    assert.equal(man.manager.GetListener(), man.listener);
    assert.equal(man.Enable(), true);
    assert.equal(man.manager.GetListener(), man.listener);
    assert.deepEqual(
        [
            context.listener.positionX.value,
            context.listener.positionY.value,
            context.listener.positionZ.value,
        ],
        [ 0, 0, 0 ],
    );
    man.Dispose();
});

test("CjsAudioMan lazily owns Carbon's fixed music-player singleton", () =>
{
    const man = new CjsAudioMan(CreateDocument(), {
        createContext: () => PlaybackContext([]),
    });
    const first = man.GetMusicPlayer();

    assert.equal(first.ID, 3);
    assert.equal(first.name, "Music");
    assert.equal(man.musicPlayer, first);
    assert.equal(man.manager.GetAudioEmitter(3), first);
    assert.equal(man.ReleaseEmitter(first), true);
    assert.notEqual(man.GetMusicPlayer(), first);
    man.Dispose();
});

test("effective media configuration changes clear the attached music cache", () =>
{
    const log = [];
    let clears = 0;
    const musicEngine = {
        HandlesEvent: () => false,
        PostEvent() {},
        ExecuteAction() {},
        Process() {},
        Dispose() {},
        ClearMedia()
        {
            clears++;
            return 0;
        },
    };
    const man = new CjsAudioMan(CreateDocument(), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read: () => new Uint8Array([ 1 ]),
        },
        musicEngine,
    });

    assert.equal(man.Enable(), true);
    man.SetDelivery("whole");
    assert.equal(clears, 1);
    man.SetLanguages([ "en" ]);
    assert.equal(clears, 2);

    man.Disable();
    man.SetMediaProvider({
        Read: () => new Uint8Array([ 2 ]),
    });
    assert.equal(clears, 3);

    man.Dispose();
});

test("CjsAudioMan owns default and disabled-state bank intent", () =>
{
    const man = new CjsAudioMan(CreateDocument(), {
        createContext: () => PlaybackContext([]),
        defaultSoundBanks: [ "base.bnk" ],
    });

    man.LoadSoundBank("queued.bnk");
    assert.deepEqual(man.banksWaitingToLoad, [ "queued.bnk" ]);
    assert.equal(man.Enable([ "scene.bnk" ]), true);
    assert.deepEqual(man.GetLoadedSoundBanks().sort(), [
        "Init.bnk",
        "base.bnk",
        "queued.bnk",
        "scene.bnk",
    ]);

    man.AddAndLoadDefaultSoundBank("always.bnk");
    assert.equal(man.UnloadSoundBank("always.bnk"), false);
    assert.deepEqual(man.SwapSoundBanks([ "next.bnk" ]), {
        loaded: [ "next.bnk" ],
        unloaded: [ "queued.bnk", "scene.bnk" ],
    });
    assert.deepEqual(man.GetLoadedSoundBanks().sort(), [
        "Init.bnk",
        "always.bnk",
        "base.bnk",
        "next.bnk",
    ]);

    man.Disable();
    assert.equal(man.GetState(), 1);
    assert.equal(man.UnloadSoundBank("next.bnk"), true);
    man.LoadSoundBank("later.bnk");
    assert.equal(man.Enable(), true);
    assert.deepEqual(man.GetLoadedSoundBanks().sort(), [
        "Init.bnk",
        "always.bnk",
        "base.bnk",
        "later.bnk",
    ]);
    assert.equal(man.SetGlobalRTPC("volume", 0.5), true);
    assert.equal(man.SetState("music", "danger"), true);

    assert.equal(man.RemoveAndUnloadDefaultSoundBank("always.bnk"), true);
    assert.deepEqual(man.defaultSoundBanks, [ "base.bnk" ]);
    man.StopAllPlayingSounds();
    man.Dispose();
});

test("whole delivery reads a complete original bank and slices locally", async () =>
{
    const log = [];
    const reads = [];
    const man = new CjsAudioMan(CreateDocument({ embedded: true }), {
        createContext: () => FakeContext(log),
        delivery: "whole",
        mediaProvider: {
            Read(source, context)
            {
                reads.push([ source, context ]);
                return new Uint8Array([
                    0, 0, 0, 0,
                    5, 6, 7, 8,
                    0, 0, 0, 0,
                ]);
            },
        },
    });

    assert.equal(man.Enable(), true);
    assert.equal(man.ResolveMedia(777).route, "whole");
    await man.LoadMedia(777);
    assert.equal(reads[0][1].kind, "bank");
    assert.deepEqual([ ...log[0][1] ], [ 5, 6, 7, 8 ]);
    man.Dispose();
});

test("range delivery reads the original bank member with its indexed offset", async () =>
{
    const log = [];
    const ranges = [];
    const man = new CjsAudioMan(CreateDocument({ embedded: true }), {
        createContext: () => FakeContext(log),
        delivery: "range",
        mediaProvider: {
            ReadRange(source, context)
            {
                ranges.push([ source, context ]);
                return {
                    bytes: new Uint8Array([ 9, 10, 11, 12 ]),
                    complete: false,
                };
            },
        },
    });

    assert.equal(man.Enable(), true);
    assert.equal(man.ResolveMedia(777).route, "range");
    await man.LoadMedia(777);
    assert.equal(ranges[0][1].offset, 4);
    assert.equal(ranges[0][1].byteLength, 4);
    assert.deepEqual([ ...log[0][1] ], [ 9, 10, 11, 12 ]);
    man.Dispose();
});

test("original PCM wem files are prepared into AudioBuffer channel data", async () =>
{
    const log = [];
    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "original:777",
            resPath: "res:/audio/777.wem",
            mediaType: "audio/x-wem",
        },
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read()
            {
                return {
                    bytes: CreatePcmWem(),
                    mediaType: "application/octet-stream",
                };
            },
        },
    });

    assert.equal(man.Enable(), true);

    const buffer = await man.LoadMedia(777);
    const samples = buffer.getChannelData(0);

    assert.equal(buffer.sampleRate, 48000);
    assert.equal(samples.length, 2);
    assert.equal(samples[0], -1);
    assert.ok(samples[1] > 0.99);
    assert.equal(
        log.some(value => Array.isArray(value) && value[0] === "decode"),
        false,
        "runtime-resource decoded PCM without browser encoded-media decode",
    );
    man.Dispose();
});

test("CjsAudioMan resolves authored switch and blend nodes before media delivery", async () =>
{
    const log = [];
    const reads = [];
    let missingLayer = false;
    const context = PlaybackContext(log);
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                weapon_fire: {
                    eventID: 42,
                    eventsStoppedBy: [],
                    is2D: 1,
                    isLoop: 0,
                    isVital: 1,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {},
        },
        media: {
            "777": {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
            },
            "778": {
                sourceID: "prepared:778",
                resPath: "res:/audio/778.ogg",
                mediaType: "ogg",
            },
        },
        banks: {},
        sfx: {
            schemaVersion: 2,
            events: {
                weapon_fire: [ { nodeId: "1" } ],
            },
            nodes: {
                "1": {
                    type: "switch",
                    group: "ship_size",
                    scope: "switch",
                    cases: {
                        large: { nodeId: "2" },
                    },
                    default: { nodeId: "10" },
                },
                "2": {
                    type: "blend",
                    children: [
                        { nodeId: "10" },
                        { nodeId: "11" },
                    ],
                },
                "10": {
                    type: "sound",
                    mediaId: "777",
                    spatial: true,
                },
                "11": {
                    type: "sound",
                    mediaId: "778",
                    spatial: false,
                },
            },
        },
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read(source)
            {
                reads.push(source.sourceID);
                if (missingLayer && source.sourceID === "prepared:778")
                {
                    throw new Error("retired optional layer");
                }
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);

    const emitter = man.CreateEmitter();

    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    emitter.Wake();
    assert.equal(emitter.SetSwitch("ship_size", "large"), true);
    assert.ok(emitter.SendEvent("weapon_fire") > 0);

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(reads.sort(), [ "prepared:777", "prepared:778" ]);
    assert.equal(context.sources.length, 2);
    assert.equal(context.sources.every(source => source.started), true);
    assert.equal(
        context.gains[4].connectedTo,
        context.gains[5],
        "the authored 3D leaf retains its live control gain",
    );
    assert.equal(
        context.gains[5].connectedTo,
        context.gains[3],
        "the authored 3D leaf's Stop envelope routes through the panner",
    );
    assert.equal(
        context.gains[6].connectedTo,
        context.gains[7],
        "the 2D sibling retains its live control gain",
    );
    assert.equal(
        context.gains[7].connectedTo,
        context.gains[8],
        "the 2D sibling's Stop envelope routes through the flat gain",
    );
    assert.equal(context.gains[8].connectedTo, context.gains[1]);

    missingLayer = true;
    assert.equal(man.ReleaseMedia(778), 1);
    assert.ok(emitter.SendEvent("weapon_fire") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(
        context.sources.length,
        3,
        "a playable blend layer survives one unavailable sibling",
    );
    assert.equal(
        context.gains[9].connectedTo,
        context.gains[10],
        "the surviving layer keeps its independent Stop envelope",
    );
    assert.equal(
        context.gains[10].connectedTo,
        context.gains[3],
        "the surviving layer retains its own authored spatial route",
    );
    man.Dispose();
});

test("CjsAudioMan acquires each Continuous Sequence child at its boundary", async () =>
{
    const log = [];
    const reads = [];
    const context = PlaybackContext(log);
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                ambience_play: {
                    eventID: 42,
                    eventsStoppedBy: [],
                    is2D: 1,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {},
        },
        media: {
            "777": {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
            },
            "778": {
                sourceID: "prepared:778",
                resPath: "res:/audio/778.ogg",
                mediaType: "ogg",
            },
        },
        banks: {},
        sfx: {
            schemaVersion: 2,
            events: {
                ambience_play: [ { nodeId: "1" } ],
            },
            nodes: {
                "1": {
                    type: "sequence",
                    children: [
                        { nodeId: "10" },
                        { nodeId: "11" },
                    ],
                    continuous: {
                        loopCount: 1,
                        transition: "delay",
                        transitionMs: 500,
                        resetPlaylistEachPlay: true,
                    },
                },
                "10": {
                    type: "sound",
                    mediaId: "777",
                },
                "11": {
                    type: "sound",
                    mediaId: "778",
                },
            },
        },
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read(source)
            {
                reads.push(source.sourceID);
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);

    const emitter = man.CreateEmitter();

    emitter.SetPosition(
        [ 0, 0, 1 ],
        [ 0, 1, 0 ],
        [ 0, 0, 0 ],
    );
    emitter.Wake();
    assert.ok(emitter.SendEvent("ambience_play") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(reads, [ "prepared:777" ]);
    assert.equal(context.sources.length, 1);

    context.currentTime = 1;
    context.sources[0].onended();
    for (let index = 0; index < 4; index++)
    {
        await new Promise(resolve => setImmediate(resolve));
    }

    assert.deepEqual(reads, [ "prepared:777", "prepared:778" ]);
    assert.equal(context.sources.length, 2);
    assert.equal(context.sources[1].startedAt, 1.5);

    context.currentTime = 2.5;
    context.sources[1].onended();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(man.system.backend.GetPlayingCount(), 0);
    man.Dispose();
});

test("pending SFX keeps post-time RTPC delay but realizes live gain and pitch", async () =>
{
    const log = [];
    const pending = Deferred();
    const context = PlaybackContext(log);
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                engine_play: {
                    eventID: 42,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {},
        },
        media: {
            "777": {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
            },
        },
        banks: {},
        sfx: {
            schemaVersion: 2,
            events: {
                engine_play: [ { nodeId: "1" } ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "777",
                    rtpcCurves: [
                        {
                            rtpc: "load",
                            scope: "object",
                            property: "volume",
                            scaling: 2,
                            points: [
                                { x: 0, value: 0, interpolation: 4 },
                                { x: 1, value: -0.5, interpolation: 4 },
                            ],
                        },
                        {
                            rtpc: "speed",
                            scope: "object",
                            property: "pitch",
                            scaling: 0,
                            points: [
                                { x: 0, value: 0, interpolation: 4 },
                                { x: 1, value: 1200, interpolation: 4 },
                            ],
                        },
                        {
                            rtpc: "delay",
                            scope: "object",
                            property: "initialDelay",
                            scaling: 0,
                            points: [
                                { x: 0, value: 0, interpolation: 4 },
                                { x: 1, value: 1, interpolation: 4 },
                            ],
                        },
                    ],
                },
            },
        },
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read()
            {
                return pending.promise;
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);

    const emitter = man.CreateEmitter();

    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    emitter.Wake();
    assert.equal(emitter.SetRTPC("delay", 0.25), true);
    assert.equal(emitter.SetRTPC("load", 0), true);
    assert.equal(emitter.SetRTPC("speed", 0), true);
    assert.ok(emitter.SendEvent("engine_play") > 0);

    await new Promise(resolve => setImmediate(resolve));
    assert.equal(emitter.SetRTPC("delay", 0), true);
    assert.equal(emitter.SetRTPC("load", 1), true);
    assert.equal(emitter.SetRTPC("speed", 1), true);

    pending.resolve(new Uint8Array([ 1, 2, 3, 4 ]));
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(context.sources.length, 1);
    assert.equal(context.sources[0].playbackRate.value, 2);
    assert.equal(context.gains[4].gain.value, 0.5);
    assert.equal(
        context.sources[0].startedAt,
        0.25,
        "InitialDelay is captured when the event is posted",
    );
    man.Dispose();
});

test("CjsAudioMan lets the authored Stop program own metadata-related timing", async () =>
{
    const context = PlaybackContext([]);
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                engine_loop: {
                    eventID: 7,
                    eventsStoppedBy: [ "engine_stop" ],
                    is2D: 0,
                    isLoop: 1,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
                engine_stop: {
                    eventID: 8,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {},
        },
        media: {
            "777": {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
            },
        },
        banks: {},
        sfx: {
            schemaVersion: 2,
            events: {
                engine_loop: [ { nodeId: "200" } ],
            },
            programs: {
                engine_loop: [
                    {
                        kind: "play",
                        child: { nodeId: "200" },
                    },
                ],
                engine_stop: [
                    {
                        kind: "stop",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        transitionMs: 250,
                        curve: 4,
                        actionFlags: 6,
                        exceptions: [],
                    },
                ],
            },
            nodes: {
                "200": {
                    type: "sound",
                    mediaId: "777",
                    matchIds: [ "200", "700" ],
                    loop: true,
                },
            },
        },
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read: () => new Uint8Array([ 1, 2, 3, 4 ]),
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);

    const emitter = man.CreateEmitter();

    emitter.SetPosition(
        [ 0, 0, 1 ],
        [ 0, 1, 0 ],
        [ 0, 0, 0 ],
    );
    emitter.Wake();
    assert.ok(emitter.SendEvent("engine_loop") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(context.sources.length, 1);
    context.currentTime = 0.1;
    assert.ok(emitter.SendEvent("engine_stop") > 0);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(
        context.sources[0].stoppedAt,
        0.35,
        "the decoded 250ms transition replaces the metadata fallback's 1s fade",
    );
    man.Dispose();
});

test("a selective Stop releases one pending leaf without blocking its sibling", async () =>
{
    const context = PlaybackContext([]);
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                parallel_play: {
                    eventID: 7,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
                stop_first: {
                    eventID: 8,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {},
        },
        media: {
            "777": {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
            },
            "778": {
                sourceID: "prepared:778",
                resPath: "res:/audio/778.ogg",
                mediaType: "ogg",
            },
        },
        banks: {},
        sfx: {
            schemaVersion: 2,
            events: {
                parallel_play: [
                    { nodeId: "200" },
                    { nodeId: "300" },
                ],
            },
            programs: {
                parallel_play: [
                    {
                        kind: "play",
                        child: { nodeId: "200" },
                    },
                    {
                        kind: "play",
                        child: { nodeId: "300" },
                    },
                ],
                stop_first: [
                    {
                        kind: "stop",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        transitionMs: 0,
                        curve: 4,
                        actionFlags: 6,
                        exceptions: [],
                    },
                ],
            },
            nodes: {
                "200": {
                    type: "sound",
                    mediaId: "777",
                    matchIds: [ "200", "700" ],
                },
                "300": {
                    type: "sound",
                    mediaId: "778",
                    matchIds: [ "300", "800" ],
                },
            },
        },
    };
    const reads = [];
    let firstSignal = null;
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read(source, request)
            {
                reads.push(source.sourceID);
                if (source.sourceID === "prepared:777")
                {
                    firstSignal = request.signal;
                    return new Promise((resolve, reject) =>
                    {
                        request.signal.addEventListener("abort", () =>
                        {
                            reject(request.signal.reason);
                        }, { once: true });
                    });
                }
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);
    const emitter = man.CreateEmitter();

    emitter.SetPosition(
        [ 0, 0, 1 ],
        [ 0, 1, 0 ],
        [ 0, 0, 0 ],
    );
    emitter.Wake();
    assert.ok(emitter.SendEvent("parallel_play") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(reads.sort(), [ "prepared:777", "prepared:778" ]);
    assert.equal(context.sources.length, 0);
    assert.equal(firstSignal.aborted, false);

    assert.ok(emitter.SendEvent("stop_first") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(firstSignal.aborted, true);
    assert.equal(context.sources.length, 1);
    assert.equal(context.sources[0].started, true);
    man.Dispose();
});

test("a selective Stop releases one pending leaf in a shared Continuous batch", async () =>
{
    const context = PlaybackContext([]);
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                continuous_play: {
                    eventID: 7,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
                stop_first: {
                    eventID: 8,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {},
        },
        media: {
            "777": {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
            },
            "778": {
                sourceID: "prepared:778",
                resPath: "res:/audio/778.ogg",
                mediaType: "ogg",
            },
        },
        banks: {},
        sfx: {
            schemaVersion: 2,
            events: {
                continuous_play: [ { nodeId: "100" } ],
            },
            programs: {
                stop_first: [
                    {
                        kind: "stop",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        transitionMs: 0,
                        curve: 4,
                        actionFlags: 6,
                        exceptions: [],
                    },
                ],
            },
            nodes: {
                "100": {
                    type: "sequence",
                    children: [ { nodeId: "150" } ],
                    continuous: {
                        loopCount: 1,
                        transition: "disabled",
                        resetPlaylistEachPlay: true,
                    },
                },
                "150": {
                    type: "parallel",
                    children: [
                        { nodeId: "200" },
                        { nodeId: "300" },
                    ],
                },
                "200": {
                    type: "sound",
                    mediaId: "777",
                    matchIds: [ "200", "700" ],
                },
                "300": {
                    type: "sound",
                    mediaId: "778",
                    matchIds: [ "300", "800" ],
                },
            },
        },
    };
    let firstSignal = null;
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read(source, request)
            {
                if (source.sourceID === "prepared:777")
                {
                    firstSignal = request.signal;
                    return new Promise((resolve, reject) =>
                    {
                        request.signal.addEventListener("abort", () =>
                        {
                            reject(request.signal.reason);
                        }, { once: true });
                    });
                }
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);
    const emitter = man.CreateEmitter();

    emitter.SetPosition(
        [ 0, 0, 1 ],
        [ 0, 1, 0 ],
        [ 0, 0, 0 ],
    );
    emitter.Wake();
    assert.ok(emitter.SendEvent("continuous_play") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(context.sources.length, 0);
    assert.equal(firstSignal.aborted, false);

    assert.ok(emitter.SendEvent("stop_first") > 0);
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(firstSignal.aborted, true);
    assert.equal(context.sources.length, 1);
    assert.equal(context.sources[0].started, true);
    man.Dispose();
});

test("two events share acquisition until the final playing record stops", async () =>
{
    const context = PlaybackContext([]);
    const library = CreateDocument({
        direct: {
            sourceID: "prepared:777",
            resPath: "res:/audio/777.ogg",
            mediaType: "ogg",
            byteLength: 4,
        },
    });

    library.metadata.Events.shared_shot = {
        eventID: 42,
        is2D: 0,
        isLoop: 0,
        soundbanks: [ "ships.bnk" ],
    };
    library.metadata.SoundBanks["ships.bnk"] = {
        EssentialSoundBank: 0,
    };
    library.eventMedia = {
        shared_shot: [ "777" ],
    };

    let providerSignal = null;
    let reads = 0;
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read(source, request)
            {
                reads++;
                providerSignal = request.signal;
                return new Promise((resolve, reject) =>
                {
                    request.signal.addEventListener("abort", () =>
                    {
                        reject(request.signal.reason);
                    }, { once: true });
                });
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);
    const firstEmitter = man.CreateEmitter();
    const secondEmitter = man.CreateEmitter();

    for (const emitter of [ firstEmitter, secondEmitter ])
    {
        emitter.SetPosition(
            [ 0, 0, 1 ],
            [ 0, 1, 0 ],
            [ 0, 0, 0 ],
        );
        emitter.Wake();
    }

    const first = firstEmitter.SendEvent("shared_shot");
    const second = secondEmitter.SendEvent("shared_shot");

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reads, 1);
    assert.equal(providerSignal.aborted, false);

    assert.equal(
        firstEmitter.ExecuteActionOnPlayingID(first, "stop", 0),
        true,
    );
    assert.equal(
        providerSignal.aborted,
        false,
        "the second event retains its shared acquisition lease",
    );

    assert.equal(
        secondEmitter.ExecuteActionOnPlayingID(second, "stop", 0),
        true,
    );
    assert.equal(providerSignal.aborted, true);
    assert.equal(man.system.backend.GetPlayingCount(), 0);
    man.Dispose();
});

function CreatePcmWem()
{
    const bytes = new Uint8Array(48);
    const view = new DataView(bytes.buffer);

    bytes.set([ 0x52, 0x49, 0x46, 0x46 ], 0);
    view.setUint32(4, 40, true);
    bytes.set([ 0x57, 0x41, 0x56, 0x45 ], 8);
    bytes.set([ 0x66, 0x6d, 0x74, 0x20 ], 12);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 48000, true);
    view.setUint32(28, 96000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    bytes.set([ 0x64, 0x61, 0x74, 0x61 ], 36);
    view.setUint32(40, 4, true);
    view.setInt16(44, -32768, true);
    view.setInt16(46, 32767, true);
    return bytes;
}
