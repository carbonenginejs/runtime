import assert from "node:assert/strict";
import test from "node:test";
import { AudEmitter, AudGameObjResource, AudioCurveSetDriver, CjsAudioSystem } from "../../npm/dist/audio/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";

class AudioGraph
{
    child = null;
    emitters = new Map();
    drivers = new Set();
    Traverse() { throw new Error("audio must use canonical graph traversal"); }
}
CjsSchema.define(AudioGraph, { className: "BlueAudioAdoptionGraph", members: [
    { name: "child", key: "child", type: { kind: "objectRef", className: AudioGraph } },
    { name: "emitters", key: "emitters", type: { kind: "map", valueType: AudGameObjResource } },
    { name: "drivers", key: "drivers", type: { kind: "set", itemType: AudioCurveSetDriver } },
] });

test("headless audio adoption/release reaches a declared non-model graph with cycles and collections", () =>
{
    let contexts = 0;
    let media = 0;
    const system = new CjsAudioSystem({
        createContext() { contexts++; throw new Error("no playback requested"); },
        loadBuffer() { media++; throw new Error("no media requested"); },
    });
    const first = new AudEmitter();
    const second = new AudEmitter();
    const driver = new AudioCurveSetDriver();
    driver.audioParameterName = "boost";
    const root = new AudioGraph();
    const child = root.child = new AudioGraph();
    child.child = root;
    child.emitters.set("first", first);
    root.emitters.set("shared", first);
    root.emitters.set("second", second);
    root.drivers.add(driver);
    system.Attach();
    try
    {
        assert.equal(root.__state, undefined);
        assert.deepEqual(system.AdoptGraph(root), [first, second, driver]);
        assert.deepEqual(system.AdoptGraph(root), [first, second, driver]);
        assert.equal(system.manager.GetAudioEmitter(first.ID), first);
        assert.equal(system.manager.GetAudioEmitter(second.ID), second);
        assert.deepEqual(system.ReleaseGraph(root), [first, second, driver]);
        assert.deepEqual(system.ReleaseGraph(root), []);
        assert.equal(system.manager.GetAudioEmitter(first.ID), null);
        assert.equal(contexts, 0);
        assert.equal(media, 0);
        assert.equal(system.backend, null);
    }
    finally
    {
        system.Dispose();
        system.Detach();
    }
});

test("an audio emitter root does not conceal declared descendant drivers", () =>
{
    class ParentEmitter extends AudEmitter {}
    CjsSchema.define(ParentEmitter, { className: "BlueAudioParentEmitter", members: [
        { name: "driver", key: "driver", type: { kind: "objectRef", className: AudioCurveSetDriver } }
    ] });
    const root = new ParentEmitter();
    root.driver = new AudioCurveSetDriver();
    const system = new CjsAudioSystem();
    system.Attach();
    try
    {
        assert.deepEqual(system.AdoptGraph(root), [root, root.driver]);
        assert.deepEqual(system.ReleaseGraph(root), [root, root.driver]);
        assert.deepEqual(system.AdoptGraph(null), []);
        assert.deepEqual(system.ReleaseGraph(null), []);
    }
    finally
    {
        system.Dispose();
        system.Detach();
    }
});
