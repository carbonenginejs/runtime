import assert from "node:assert/strict";
import test from "node:test";
import { AudioCurveSetDriver } from "../../npm/dist/audio/trinity/audio/AudioCurveSetDriver.js";
import { AudGameObjResource } from "../../npm/dist/audio/trinity/audio/AudGameObjResource.js";
import { AudManager } from "../../npm/dist/audio/trinity/audio/AudManager.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { ICurveSetDriver } from "../../npm/dist/global/blue/ICurveSetDriver.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

function withManager(manager, run)
{
    const previous = AudGameObjResource.manager;
    AudGameObjResource.manager = manager;
    try { return run(); }
    finally { AudGameObjResource.manager = previous; }
}

test("native driver bases and mappings require no model or values instance machinery", () =>
{
    withManager(null, () =>
    {
        const backend = AudGameObjResource.backend;
        const driver = new AudioCurveSetDriver();
        assert.equal(Object.getPrototypeOf(AudioCurveSetDriver.prototype), ICurveSetDriver.prototype);
        assert.equal(CjsSchema.cast(driver, ICurveSetDriver), driver);
        assert.equal(CjsSchema.cast(driver, IInitialize), driver);
        assert.deepEqual([...mappedInterfaces(AudioCurveSetDriver)], [AudioCurveSetDriver, ICurveSetDriver, IInitialize]);
        assert.equal(CjsSchema.GetConstructor("AudioCurveSetDriver"), AudioCurveSetDriver);
        assert.equal(AudioCurveSetDriver.from, undefined);
        for (const member of ["__state", "GetValues", "SetValues", "UpdateValues", "Traverse"])
        {
            assert.equal(member in driver, false, member);
        }
        assert.equal(driver.name, "");
        assert.equal(driver.audioParameterName, "");
        assert.equal(driver.audioParameterValue, 0);
        assert.equal(driver.fallbackCurve, null);
        assert.equal(driver.isValid, false);
        driver.audioParameterName = "headless";
        assert.equal(driver.Initialize(), true);
        assert.equal(driver.GetCurveSetTime(4), 0);
        driver.Dispose();
        assert.equal(AudGameObjResource.backend, backend);
        assert.equal(AudGameObjResource.manager, null);
    });
});

test("Blue declarations retain native stored/live roles and wide-string types", () =>
{
    new AudioCurveSetDriver();
    const schema = CjsSchema.getSchema(AudioCurveSetDriver);
    assert.deepEqual(schema.members.map(field => field.name), [
        "name", "audioParameterName", "audioParameterValue", "fallbackCurve",
    ]);
    const stored = schema.members.find(field => field.name === "audioParameterName");
    const live = schema.properties.find(field => field.name === "audioParameterName");
    assert.equal(stored.key, "_audioParameterName");
    assert.equal(stored.type.kind, "wstring");
    assert.equal(stored.edit.persistOnly, true);
    assert.equal(live.key, "audioParameterName");
    assert.equal(live.type.kind, "wstring");
    assert.equal(live.edit.write, true);
    assert.equal(schema.members[0].type.kind, "wstring");
    assert.equal(schema.members[2].type.kind, "float32");
    assert.equal(schema.members[3].type.className, "ITriScalarFunction");
    const valid = schema.properties.find(field => field.name === "isValid");
    assert.equal(valid.type.kind, "boolean");
    assert.equal(valid.edit.read, true);
    assert.notEqual(valid.edit.write, true);
});

test("existing dictionary construction fills stored names before one initialization", () =>
{
    const manager = new AudManager();
    // Seed the native Disabled state without enabling a backend or loading banks.
    manager._state = "disabled";
    withManager(manager, () =>
    {
        const prototype = AudioCurveSetDriver.prototype;
        const setName = prototype.SetAudioParameterName;
        prototype.SetAudioParameterName = () => assert.fail("stored read called live setter");
        let driver;
        try
        {
            driver = new DictReader().CreateObject({
                _type: "AudioCurveSetDriver", name: "主推力", audioParameterName: "boost",
            });
        }
        finally { prototype.SetAudioParameterName = setName; }
        assert.equal(driver.constructor, AudioCurveSetDriver);
        assert.equal(driver.name, "主推力");
        assert.equal(driver.audioParameterName, "boost");
        assert.equal(manager.GetParameterInfo("boost").watchers, 1);
        driver.Initialize();
        assert.equal(manager.GetParameterInfo("boost").watchers, 1);
        driver.audioParameterName = "speed";
        assert.equal(manager.GetParameterInfo("boost"), null);
        assert.equal(manager.GetParameterInfo("speed").watchers, 1);
        driver.Dispose();
    });
});

test("deferred watchers register once and release through their original manager", () =>
{
    const first = new AudManager();
    const second = new AudManager();
    second._state = "disabled";
    withManager(first, () =>
    {
        const driver = new AudioCurveSetDriver();
        driver.audioParameterName = "boost";
        driver.Initialize();
        assert.equal(first.GetParameterInfo("boost"), null);
        first._state = "disabled";
        driver.Initialize();
        driver.Initialize();
        assert.equal(first.GetParameterInfo("boost").watchers, 1);
        AudGameObjResource.manager = second;
        driver.audioParameterName = "speed";
        assert.equal(first.GetParameterInfo("boost"), null);
        assert.equal(second.GetParameterInfo("speed").watchers, 1);
        driver.audioParameterName = "speed";
        assert.equal(second.GetParameterInfo("speed").watchers, 1);
        AudGameObjResource.manager = first;
        driver.Dispose();
        driver.Dispose();
        assert.equal(second.GetParameterInfo("speed"), null);
        driver.audioParameterName = "";
        assert.equal(first.GetParameterInfo(""), null);
    });
});

test("native fallback uses unchanged time and a missing record preserves cached values", () =>
{
    const manager = new AudManager();
    manager._state = "enabled";
    withManager(manager, () =>
    {
        const driver = new AudioCurveSetDriver();
        const sampled = [];
        driver.fallbackCurve = { GetValueAt(time) { sampled.push(time); return time * 2; } };
        driver.audioParameterName = "boost";
        assert.equal(driver.GetCurveSetTime(3.25), 6.5);
        const record = manager.GetParameterInfo("boost");
        record.parameterValue = 17;
        record.parameterExists = true;
        assert.equal(driver.GetCurveSetTime(4), 17);
        assert.equal(driver.isValid, true);
        assert.deepEqual(sampled, [3.25]);
        manager.UnregisterParameter("boost");
        assert.equal(driver.GetCurveSetTime(5), 17, "native retains cached value when record disappears");
        manager._state = "disabled";
        assert.equal(driver.GetCurveSetTime(6), 12);
        driver.fallbackCurve = null;
        assert.equal(driver.GetCurveSetTime(7), 17, "invalid without fallback returns the cache");
        driver.Dispose();
    });
});

test("copying stored names transfers the live destination from manager A to B without its setter", () =>
{
    const source = withManager(null, () =>
    {
        const driver = new AudioCurveSetDriver();
        driver.audioParameterName = "speed";
        return driver;
    });
    const managerA = new AudManager();
    const managerB = new AudManager();
    managerA._state = "disabled";
    managerB._state = "disabled";
    withManager(managerA, () =>
    {
        const destination = new AudioCurveSetDriver();
        destination.audioParameterName = "boost";
        assert.equal(managerA.GetParameterInfo("boost").watchers, 1);
        AudGameObjResource.manager = managerB;
        destination.SetAudioParameterName = () => assert.fail("copy must bypass the live setter");
        assert.equal(new Copier().CopyTo(source, destination), destination);
        assert.equal(destination.audioParameterName, "speed");
        assert.equal(managerA.GetParameterInfo("boost"), null);
        assert.equal(managerA.GetParameterInfo("speed"), null);
        assert.equal(managerB.GetParameterInfo("speed").watchers, 1);
        destination.Initialize();
        assert.equal(managerB.GetParameterInfo("speed").watchers, 1);
        source._audioParameterName = "";
        assert.equal(new Copier().CopyTo(source, destination), destination);
        assert.equal(destination.audioParameterName, "");
        assert.equal(managerB.GetParameterInfo("speed"), null);
        assert.equal(managerB.GetParameterInfo(""), null);
        destination.Dispose();
    });
});

test("TriCurveSet consumes the real model-free driver during its normal update", () =>
{
    withManager(null, () =>
    {
        const driver = new AudioCurveSetDriver();
        driver.fallbackCurve = { GetValueAt: time => time + 10 };
        const curves = new TriCurveSet();
        curves.driver = driver;
        curves.isPlaying = true;
        curves.UpdateAt(3);
        assert.equal(curves.scaledTime, 13);
        curves.UpdateAt(4);
        assert.equal(curves.scaledTime, 14);
    });
});

test("an installed broken collaborator throws instead of silently degrading to headless", () =>
{
    withManager({}, () =>
    {
        const driver = new AudioCurveSetDriver();
        assert.throws(() => driver.GetCurveSetTime(0), TypeError);
        assert.throws(() => { driver.audioParameterName = "boost"; }, TypeError);
    });
    withManager(null, () =>
    {
        const driver = new AudioCurveSetDriver();
        driver.fallbackCurve = {};
        assert.throws(() => driver.GetCurveSetTime(0), TypeError);
    });
    const manager = new AudManager();
    manager._state = "disabled";
    withManager(manager, () =>
    {
        const driver = new AudioCurveSetDriver();
        driver.audioParameterName = "boost";
        const unregister = manager.UnregisterParameter;
        manager.UnregisterParameter = undefined;
        assert.throws(() => driver.Dispose(), TypeError);
        manager.UnregisterParameter = unregister;
        driver.Dispose();
        assert.equal(manager.GetParameterInfo("boost"), null);
    });
});

test("native exposure ends at the driver instead of traversing the primary base table", () =>
{
    class UnrelatedExposure {}
    const record = Symbol.for("carbonenginejs.carbon.mappedInterfaces");
    const original = Object.getOwnPropertyDescriptor(ICurveSetDriver, record);
    try
    {
        CjsSchema.meta.blue.interfaceTable({ interfaces: [UnrelatedExposure], chainTo: null })(ICurveSetDriver);
        assert.ok(mappedInterfaces(ICurveSetDriver).has(UnrelatedExposure));
        assert.deepEqual([...mappedInterfaces(AudioCurveSetDriver)], [AudioCurveSetDriver, ICurveSetDriver, IInitialize]);
        assert.equal(CjsSchema.cast(new AudioCurveSetDriver(), ICurveSetDriver).constructor, AudioCurveSetDriver);
    }
    finally
    {
        if (original) Object.defineProperty(ICurveSetDriver, record, original);
        else delete ICurveSetDriver[record];
    }
});
