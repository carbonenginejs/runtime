import test from "node:test";
import assert from "node:assert/strict";
import { num } from "../../npm/dist/global/math/num.js";
import { CcpTime } from "../../npm/dist/global/blue/CcpTime.js";
import { BlueCallbackMan } from "../../npm/dist/global/blue/BlueCallbackMan.js";
import { CjsBlueOS } from "../../npm/dist/global/blue/CjsBlueOS.js";
import { SpatialAudioSettings } from "../../npm/dist/audio/trinity/audio/SpatialAudioSettings.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { Tr2CurveScalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalar.js";
import { TriGeometryResMeshData } from "../../npm/dist/resource/geometry/TriGeometryResMeshData.js";

// math/src/Float16.cpp:83-220 uses round-to-even and a non-IEEE exponent 31.
test("Carbon half storage preserves ties, subnormals and native special encodings", () =>
{
    for (const [value, bits] of [[1,0x3c00],[1+2**-11,0x3c00],[1+3*2**-11,0x3c02],
        [2**-24,1],[2**-25,0],[-0,0x8000],[65536,0x7c00],[Infinity,0x7fff],[-Infinity,0xffff]])
        assert.equal(num.toCarbonHalfFloat(value),bits);
    assert.equal(num.fromCarbonHalfFloat(0x7c00),65536);
    assert.equal(num.fromCarbonHalfFloat(1),2**-24);
    assert.ok(Number.isNaN(num.fromCarbonHalfFloat(0x7fff)));
    assert.equal(num.toCarbonHalfFloat(num.fromCarbonHalfFloat(0xffff)),0xffff);
    assert.equal(num.toHalfFloat(Infinity),0x7c00,"general IEEE helper retains its contract");
});

test("dirty masks keep bit 63 and bit zero together without Number precision loss", () =>
{
    const variable = new Tr2ControllerFloatVariable();
    const holder = { value: 1 };
    variable.SetDirtyMask(holder,1n<<63n);
    variable.SetValue(2);
    assert.equal(holder.value,(1n<<63n)|1n);
    variable.SetDirtyMask(holder,1n<<64n);
    variable.SetValue(3);
    assert.equal(holder.value,(1n<<63n)|1n,"uint64 wraps the incoming mask");
    assert.throws(()=>variable.SetDirtyMask({value:2**53},1n),RangeError);
    assert.throws(()=>variable.SetDirtyMask(holder,2**53),RangeError);
});

test("audio setters retain native int32 and float32 widths", () =>
{
    const settings = new SpatialAudioSettings();
    settings.SetNumberOfPrimaryRays(0xffffffff);
    assert.equal(settings.GetNumberOfPrimaryRays(),-1);
    assert.equal(settings.PopulateInitSettings().uNumberOfPrimaryRays,0xffffffff);
    settings.SetMovementThreshold(0.1);
    assert.equal(settings.GetMovementThreshold(),Math.fround(0.1));
    assert.equal(settings.GetTransmissionLoss(),Math.fround(0.7));
});

test("curve rasterization quantizes values to Carbon half storage", () =>
{
    const curve = new Tr2CurveScalar();
    curve.GetValue = () => 1 + 2**-11;
    const data = new Float32Array(3);
    curve.Rasterize({width:2,stride:2,data});
    assert.deepEqual(Array.from(data),[1,0,1]);
});

test("geometry invalid stride uses the native unsigned sentinel", () =>
{
    assert.equal(new TriGeometryResMeshData().bytesPerVertex,0xffffffff);
});

test("calendar conversion truncates pre-epoch seconds toward zero", () =>
{
    const out = {};
    assert.equal(CcpTime.timeAsDateTime(out,(11644473600000-500)*10000),true);
    assert.deepEqual([out.year,out.month,out.day,out.hour,out.minute,out.second,out.milliseconds],
        [1970,1,1,0,0,0,500]);
});

test("callback IDs wrap at uint32 and queue statistics use float32 seconds", () =>
{
    const man = new BlueCallbackMan();
    man._nextId = 0xffffffff;
    const id = {value:0};
    man.Add(()=>{},null,0,id);
    assert.equal(id.value,0xffffffff);
    assert.equal(man.GetNextId(),0);
    man.Add(()=>{},null,0,id);
    assert.equal(id.value,0);
    assert.equal(man.GetNextId(),1);
    man._timeInQueueMax = 100000001n;
    man._timeInQueueAverage = 100000001;
    assert.equal(man.GetTimeInQueueMax(),Math.fround(0.100000001));
    assert.equal(man.GetTimeInQueueAverage(),Math.fround(0.100000001));
    man.ResetQueueStats();
    assert.equal(man._timeInQueueTotal,0n);
});


test("curve stop epsilon retains the native float32 literal", async () =>
{
    const { TriCurveSet } = await import("../../npm/dist/trinity/curves/TriCurveSet.js");
    const set = new TriCurveSet();
    set.isPlaying = true;
    set._startTime = 0;
    set._endTime = 1;
    set._lastTime = 0;
    set.Apply = () => {};
    set.ApplyTimeRange = () => {};
    set.Update(1);
    assert.equal(set.scaledTime,1-Math.fround(0.001));
});

test("smart lights round half fields before submitting the CPU record", async () =>
{
    const { EveSmartLightPointLight } = await import("../../npm/dist/trinity/eve/smartLights/EveSmartLightPointLight.js");
    const light = new EveSmartLightPointLight();
    light.innerRadius = 1+2**-11;
    light._distribution = {
        GetNumberOfPlacements: () => 1,
        GetPlacementData: () => [{initialScale:[1,1,1],additionalScale:[1,1,1],
            initialRotation:[0,0,0,1],additionalRotation:[0,0,0,1],
            initialTranslation:[0,0,0],additionalTranslation:[0,0,0]}]
    };
    let radius;
    light.GetLights({AddLight:record=>{radius=record.innerRadius;}});
    assert.equal(radius,1);
});

test("zero elapsed queue ticks do not enter native statistics", t =>
{
    const man = new BlueCallbackMan();
    // The queue stamps and measures with CcpGetTimestamp (CallbackMan.cpp:123, :408-411),
    // which reads Blue's monotonic clock here.
    t.mock.method(CjsBlueOS,"Monotonic",()=>1);
    man.Add(()=>{});
    man.Update();
    assert.equal(man._entriesProcessed,0);
    assert.equal(man._timeInQueueTotal,0n);
});
