import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue, ITriFunction, ITriVectorFunction, ITriQuaternionFunction, ITriCurveLength } from "../../npm/dist/global/blue/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { EnumerateChildren } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { createSofHydrationAdapter } from "../../npm/dist/sof/createSofHydrationAdapter.js";
import { Tr2CurveVector3Lerp } from "../../npm/dist/trinity/curves/curve/Tr2CurveVector3Lerp.js";
import { Tr2QuaternionLerpCurve } from "../../npm/dist/trinity/curves/curve/Tr2QuaternionLerpCurve.js";
import { Tr2ScalarFader } from "../../npm/dist/trinity/curves/curve/Tr2ScalarFader.js";
import { Tr2CurveConstant } from "../../npm/dist/trinity/curves/curve/Tr2CurveConstant.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { EveUpdateContext } from "../../npm/dist/trinity/eve/EveUpdateContext.js";

for (const [name, Class, Base, table] of [
    ["Tr2CurveVector3Lerp", Tr2CurveVector3Lerp, ITriVectorFunction, [Tr2CurveVector3Lerp, ITriFunction, ITriVectorFunction]],
    ["Tr2QuaternionLerpCurve", Tr2QuaternionLerpCurve, ITriQuaternionFunction, [ITriFunction, ITriQuaternionFunction, ITriCurveLength]],
    ["Tr2ScalarFader", Tr2ScalarFader, Object, [Tr2ScalarFader]]
])
{
    test(`${name} has its native base and exact query table without model helpers`, () =>
    {
        const instance = blue.classes.CreateInstanceFromName(name);
        assert.equal(instance.constructor, Class);
        assert.equal(Object.getPrototypeOf(Class.prototype), Base.prototype);
        assert.deepEqual([...mappedInterfaces(Class)], table);
        for (const method of ["SetValues", "GetValues", "OnEvent", "Clone", "Traverse", "GetResources"])
            assert.equal(method in instance, false);
        assert.equal("from" in Class, false);
        if (Class === Tr2ScalarFader)
        {
            assert.equal("Reset" in instance, false);
            assert.equal("UpdateValue" in instance, false);
            assert.equal(CjsSchema.cast(instance, ITriFunction), null);
        }
        else
        {
            assert.equal(instance.Reset, ITriFunction.prototype.Reset);
            assert.equal(instance.Reset(), undefined);
            assert.equal(CjsSchema.cast(instance, Base), instance);
        }
        assert.deepEqual(GetResources(instance), []);
    });
}

test("vector lerp declarations preserve native order, signed enum, and persistence", () =>
{
    const fields = CjsSchema.getSchema(Tr2CurveVector3Lerp).members;
    assert.deepEqual(fields.map(field => field.name), ["name", "initialValue", "startInterpolation", "curve", "curveStartTime", "currentValue"]);
    assert.equal(CjsSchema.getField(Tr2CurveVector3Lerp, "startInterpolation").type.kind, "int32");
    const curve = new Tr2CurveVector3Lerp();
    new DictReader({declarations:true, initialize:false}).ReadInto(curve, {name:"blend", initialValue:[1,2,3], startInterpolation:1, curveStartTime:4});
    assert.equal(curve.name, "blend");
    assert.deepEqual([...curve.initialValue], [1,2,3]);
    const persisted = new DictWriter().WriteObject(curve, {}, {persistOnly:true});
    assert.equal(persisted.name, "blend");
    assert.equal(persisted.curveStartTime, 4);
    for (const key of ["initialValue", "startInterpolation", "currentValue"])
        assert.equal(Object.hasOwn(persisted, key), false);
});

test("SOF hydration and shared graph operations retain live lerp child references", () =>
{
    const child = new Tr2CurveConstant();
    child.value.set([0,0,1,0]);
    const adapter = createSofHydrationAdapter();
    for (const [Class, values, keys] of [
        [Tr2CurveVector3Lerp, {name:"soa", curve:child, curveStartTime:2}, ["curve"]],
        [Tr2QuaternionLerpCurve, {start:1, length:4, startCurve:child, endCurve:child}, ["startCurve", "endCurve"]]
    ])
    {
        const curve = new Class();
        assert.equal(adapter.applyValues(curve, values), curve);
        for (const key of keys) assert.equal(curve[key], child);
        for (const [key,value] of Object.entries(values)) if (!keys.includes(key)) assert.equal(curve[key], value);
        const children = [];
        EnumerateChildren(curve, item => children.push(item));
        assert.ok(children.length > 0);
        for (const item of children) assert.equal(item, child);
        const copy = blue.classes.CopyTo(curve, new Class());
        for (const key of keys)
        {
            assert.notEqual(copy[key], child);
            assert.equal(copy[key].constructor, Tr2CurveConstant);
            assert.deepEqual([...copy[key].value], [...child.value]);
        }
        if (keys.length === 2) assert.equal(copy.startCurve, copy.endCurve);
        const serialized = new DictWriter().WriteObject(curve, {}, {persistOnly:true});
        assert.ok(Object.hasOwn(serialized, keys[0]));
        assert.deepEqual(GetResources(curve), []);
    }
});

test("lerps join native curve-set playback and expose only the supported duration", () =>
{
    const vector = new Tr2CurveVector3Lerp();
    vector.initialValue.set([2,4,6]);
    const quaternion = new Tr2QuaternionLerpCurve();
    quaternion.length = 7;
    const start = new Tr2CurveConstant();
    const end = new Tr2CurveConstant();
    end.value.set([0,0,1,0]);
    quaternion.startCurve = start;
    quaternion.endCurve = end;
    const set = new TriCurveSet();
    set.playOnLoad = false;
    set.AddCurve(vector);
    set.AddCurve(quaternion);
    assert.equal(set.GetCurvesCount(), 2);
    assert.equal(CjsSchema.cast(vector, ITriCurveLength), null);
    assert.equal(CjsSchema.cast(quaternion, ITriCurveLength), quaternion);
    assert.equal(set.GetMaxCurveDuration(), 7);
    const vectorStorage = vector.currentValue;
    const quaternionStorage = quaternion.value;
    set.PlayFrom(7);
    set.Apply();
    assert.equal(vector.currentValue, vectorStorage);
    assert.equal(quaternion.value, quaternionStorage);
    assert.deepEqual([...vectorStorage], [2,4,6]);
    assert.deepEqual([...quaternionStorage], [0,0,1,0]);
    set.Dispose();
});

test("lerps retain native null-child and no-op contracts but require methods on present children", () =>
{
    const vector = new Tr2CurveVector3Lerp();
    const out = new Float32Array([1,2,3]);
    assert.equal(vector.GetValueDotAt(2,out), out);
    assert.equal(vector.GetValueDoubleDotAt(2,out), out);
    assert.equal(vector.InterpolatedPosition(2,out), out);
    assert.deepEqual([...out], [1,2,3]);
    vector.curve = {};
    assert.throws(() => vector.UpdateValue(2), TypeError);
    const quaternion = new Tr2QuaternionLerpCurve();
    const q = new Float32Array([1,2,3,4]);
    assert.equal(quaternion.GetValueAt(2,q), q);
    assert.equal(quaternion.GetValueDotAt(2,q), q);
    assert.equal(quaternion.GetValueDoubleDotAt(2,q), q);
    assert.deepEqual([...q], [1,2,3,4]);
    quaternion.length = 2;
    quaternion.startCurve = {};
    quaternion.endCurve = new Tr2CurveConstant();
    assert.throws(() => quaternion.UpdateValue(1), TypeError);
});

test("fader reads the required delta method separately inside each active native branch", () =>
{
    const fader = new Tr2ScalarFader();
    assert.equal(fader.Update({}), undefined);
    fader.StartFade(true, 2);
    let calls = 0;
    const context = {GetDeltaT(){ return ++calls === 1 ? 0.5 : 0.25; }, get deltaT(){ throw new Error("property fallback"); }};
    fader.Update(context);
    assert.equal(calls, 2);
    assert.equal(fader.value, 0.25);
    assert.equal(fader.fadeTime, 0.25);
    assert.throws(() => fader.Update({deltaT:0.5}), TypeError);
    assert.throws(() => fader.Update({}), TypeError);
    for (const [fading, fadeTime] of [[1,-1],[0,0]])
    {
        const single = new Tr2ScalarFader();
        single.fading = fading;
        single.fadeTime = fadeTime;
        let reads = 0;
        single.Update({GetDeltaT(){ reads++; return 0.25; }});
        assert.equal(reads, 1);
        assert.equal(single.value, fading === 1 ? 0.25 : 0);
        assert.equal(single.fadeTime, fadeTime === -1 ? -1 : 0.25);
    }
});

test("fader consumes real EveUpdateContext seconds without changing strict boundary behavior", () =>
{
    const context = new EveUpdateContext();
    context.SetTime(10000000);
    context.SetTime(15000000);
    const fader = new Tr2ScalarFader();
    fader.StartFade(true, 0.5);
    fader.Update(context);
    assert.equal(fader.value, 1);
    assert.equal(fader.fading, 2);
    assert.equal(fader.fadeTime, 0.5);
    fader.Update(context);
    assert.equal(fader.value, 1);
    assert.equal(fader.fading, 0);
    assert.equal(fader.fadeTime, -1);
});

test("fader dictionary reads exposed state while Copier and persistence omit transient fields", () =>
{
    const fader = new Tr2ScalarFader();
    fader.StartFade(true, 8);
    fader.fadeTime = 0.75;
    new DictReader({declarations:true, initialize:false}).ReadInto(fader, {value:0.25, fading:-0.5});
    assert.equal(fader.value, 0.25);
    assert.equal(fader.fading, -0.5);
    const destination = new Tr2ScalarFader();
    destination.value = 0.6;
    destination.fading = -0.1;
    destination.fadeTime = 0.5;
    destination.kickInLength = 5;
    const copy = blue.classes.CopyTo(fader, destination);
    assert.equal(copy, destination);
    assert.equal(copy.value, 0.6);
    assert.equal(copy.fading, -0.1);
    assert.equal(copy.fadeTime, 0.5);
    assert.equal(copy.kickInLength, 5);
    assert.equal(CjsSchema.getField(Tr2ScalarFader,"kickInLength"), null);
    const persisted = new DictWriter().WriteObject(fader, {}, {persistOnly:true});
    for (const key of ["value","fading","fadeTime","kickInLength"])
        assert.equal(Object.hasOwn(persisted,key), false);
});
