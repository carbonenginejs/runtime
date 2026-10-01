import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

test("root constructs audio graphs without evaluating optional implementations or activating services", () =>
{
    // Preserve an explicitly supplied source overlay when verifying without a build.
    const imports = process.execArgv.flatMap((arg, index, args) =>
        arg === "--import" ? [ arg, args[index + 1] ]
            : arg.startsWith("--import=") ? [ arg ] : []);
    // Resource media parsers are a separate, intentional root surface.
    const guard = String.raw`
        export async function load(url, context, nextLoad)
        {
            if (/\/(?:CjsWebAudioSoundEngine|CjsAudioSystem|CjsAudioMan)\.js$|\/character\//u.test(url))
            {
                throw new Error("Root evaluated optional implementation: " + url);
            }
            return nextLoad(url, context);
        }
    `;
    const child = spawnSync(process.execPath, [
        ...imports,
        "--experimental-loader", `data:text/javascript,${encodeURIComponent(guard)}`,
        "--input-type=module",
        "--eval",
        `(${probe.toString()})()`,
    ], { cwd: packageRoot, encoding: "utf8", timeout: 30000 });
    assert.equal(child.error, undefined, child.error?.message);
    assert.equal(child.status, 0, child.stderr || child.stdout);
    assert.match(child.stdout, /root graph ready/u);
});

async function probe()
{
    const { default: assert } = await import("node:assert/strict");
    for (const name of [ "AudioContext", "webkitAudioContext", "Worker", "fetch" ])
    {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            get() { throw new Error(`Root touched ${name}`); },
        });
    }
    for (const name of [ "setTimeout", "setInterval", "setImmediate", "requestAnimationFrame", "queueMicrotask" ])
    {
        globalThis[name] = () => { throw new Error(`Root activated ${name}`); };
    }

    const root = await import("./npm/dist/index.js");
    for (const name of [
        "AudEmitter", "AudGameObjResource", "ITr2AudEmitter", "AudParameter",
        "AudioCurveSetDriver", "ICjsWwiseSoundEngine", "CjsWwiseSoundEngineStub",
    ])
    {
        assert.equal(typeof root[name], "function", name);
        assert.equal(root.blue.classes.GetClassRegistration(name).type, root[name], name);
    }
    for (const name of [ "CjsWebAudioSoundEngine", "CjsAudioSystem", "CjsAudioMan" ])
    {
        assert.equal(Object.hasOwn(root, name), false, name);
    }
    assert.equal(new root.AudEmitter().constructor, root.AudEmitter);
    const driver = new root.AudioCurveSetDriver();
    assert.equal(driver.Initialize(), true);
    assert.equal(driver.fallbackCurve, null);
    assert.equal(driver.IsValid(), false);
    driver.Dispose();

    for (const Constructor of [ root.AudioGameObject, root.EveChildAudio ])
    {
        const object = new Constructor();
        assert.equal(object.Initialize(), true);
        assert.equal(object.audioEmitter.constructor, root.AudEmitter);
    }
    // The observer/emitter values shape emitted by SOF; no asset loading needed.
    const observer = root.TriObserverLocal.from({
        _type: "TriObserverLocal",
        name: "engine",
        position: [ 1, 2, 3 ],
        observer: {
            _type: "AudEmitter", name: "engine", eventPrefix: "ship_",
            position: [ 1, 2, 3 ], scalingFactor: 2.5,
        },
    });
    assert.equal(observer.constructor, root.TriObserverLocal);
    assert.equal(observer.observer.constructor, root.AudEmitter);
    assert.equal(observer.observer.eventPrefix, "ship_");
    assert.equal(observer.observer.scalingFactor, 2.5);

    const stub = new root.CjsWwiseSoundEngineStub();
    assert.equal(Object.getPrototypeOf(root.CjsWwiseSoundEngineStub.prototype), root.ICjsWwiseSoundEngine.prototype);
    assert.equal(stub.Init(), true);
    stub.RegisterGameObj(7);
    assert.equal(stub.SetRTPCValue("speed", 2, 7), true);
    assert.equal(stub.GetGameObject(7).rtpcs.get("speed"), 2);
    stub.UnregisterGameObj(7);
    assert.equal(stub.GetGameObject(7), null);
    assert.equal(root.AudGameObjResource.manager, null);
    assert.equal(root.AudGameObjResource.backend, null);
    console.log("root graph ready");
}
