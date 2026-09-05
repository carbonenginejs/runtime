import test from "node:test";
import assert from "node:assert/strict";
import { Tr2LightManager, Tr2TextureArray, Tr2TextureArrayElement } from "../../npm/dist/trinity/index.js";
import { CreateLightRecord } from "../../npm/dist/trinity/eve/lights/lightConversion.js";
import { Tr2LightProfileRes } from "../../npm/dist/resource/index.js";
import { CjsIESFormat } from "../../npm/dist/resource/formats/ies/index.js";

const FLAGS = Tr2LightManager.Flags;

/**
 * The rank-1 light-profiles chain: bake -> resource -> shared array ->
 * packed slot. Carbon citations per behaviour live in the classes; these
 * tests pin the seam: the slice index is the texture-array element index
 * (Tr2LightProfileRes.cpp:63-66) with the +1 bias applied at pack time
 * (Tr2Light.cpp:137), slices are process-wide (Tr2LightManager.cpp:682-686,
 * a function-local static surviving manager teardown), and released slots
 * are reused first-fit (Tr2TextureArray.cpp:40-47).
 */

function bakedProfilePayload(peak = 500)
{
    const numbers = [ 1, 100, 1, 2, 1, 1, 1, 0.2, 0.3, 0.4, 1, 0, 60, 0, 180, 0, peak, 0 ];
    const bytes = new TextEncoder().encode(`IESNA:LM-63-1995\nTILT=NONE\n${numbers.join(" ")}\n`);
    return CjsIESFormat.read(bytes, { emit: "lightProfile" });
}

function profileResource(payload = bakedProfilePayload())
{
    return new Tr2LightProfileRes().Initialize("res:/lights/test.ies").SetPayload(payload);
}

function lightWith(profile)
{
    const record = CreateLightRecord();
    record.flags = FLAGS.DEFAULT;
    record.color.set([ 1, 1, 1 ]);
    record.radius = 2;
    record.lightProfile = profile;
    return record;
}

function packedProfileSlot(manager, lightIndex = 0)
{
    const data = manager.GetLightBufferData();
    const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
    return (bits[lightIndex * 12 + 7] >>> 16) >>> 4;
}

test("the texture array gates dimensions, reuses released slots, and rounds capacity", () =>
{
    const array = new Tr2TextureArray();
    const good = bakedProfilePayload();

    assert.equal(array.GetWidth(), 0, "width is 0 before the first element (cpp:101-104)");

    const a = array.AddElement(good);
    assert.equal(a.IsValid(), true);
    assert.equal(a.GetElementIndex(), 0);
    assert.equal(array.GetWidth(), 1024);
    assert.equal(array.GetMipCount(), 11);
    assert.equal(array.GetArraySize(), 16, "capacity rounds up to the increment");

    // The dimension gate rejects a wrong mip count SILENTLY - an invalid
    // handle, exactly how a bad light profile fails to register in Carbon.
    const rejected = array.AddElement({ ...good, mipCount: 1 });
    assert.equal(rejected.IsValid(), false);
    assert.equal(rejected.GetElementIndex(), 0, "Carbon quirk: invalid handles report index 0");

    const b = array.AddElement(bakedProfilePayload(9));
    assert.equal(b.GetElementIndex(), 1);
    assert.equal(array.GetElementCount(), 2);

    // Element data is copied in (Carbon memcpy, cpp:53): mutating the
    // source after the add must not reach the stored slice.
    good.samples[0] = 0;
    assert.notEqual(array.GetElement(0).samples[0], 0);

    // Release frees the slot; the next add reuses it first-fit.
    a.Release();
    assert.equal(array.GetElementCount(), 1);
    assert.equal(array.GetElement(0), null);
    const c = array.AddElement(bakedProfilePayload(7));
    assert.equal(c.GetElementIndex(), 0, "first-fit reuse of the released slot");
    assert.equal(a.IsValid(), false, "released handles stay invalid");
    a.Release(); // idempotent

    let changes = 0;
    const off = array.OnTextureChange(() => { changes += 1; });
    array.AddElement(bakedProfilePayload(3));
    assert.equal(changes, 1);
    off();
    array.AddElement(bakedProfilePayload(4));
    assert.equal(changes, 1, "unsubscribed listeners stay quiet");
});

test("a profile resource registers on first pack and packs its slice index biased", () =>
{
    const manager = new Tr2LightManager();
    const resource = profileResource();

    assert.equal(resource.GetTextureIndex(), -1, "unregistered before the first pack");

    manager.AddLight(lightWith(resource));
    manager.ResolveLightData();

    const index = resource.GetTextureIndex();
    assert.ok(index >= 0, "the pack registered the profile with the shared array");
    assert.equal(packedProfileSlot(manager), index + 1, "packed slot is the slice index biased by one");

    // A second manager shares the same process-wide array: same resource,
    // same slice, no second registration.
    const other = new Tr2LightManager();
    other.AddLight(lightWith(resource));
    other.ResolveLightData();
    assert.equal(packedProfileSlot(other), index + 1, "slices are process-wide");
    assert.equal(resource.GetTextureIndex(), index);
});

test("unloading a profile releases its slice for reuse", () =>
{
    const array = Tr2LightManager.getLightProfileArray();
    const before = array.GetElementCount();

    const resource = profileResource();
    const manager = new Tr2LightManager();
    manager.AddLight(lightWith(resource));
    manager.ResolveLightData();
    const index = resource.GetTextureIndex();
    assert.equal(array.GetElementCount(), before + 1);

    resource.SetPayload(null);
    assert.equal(resource.GetTextureIndex(), -1, "unload releases the slice");
    assert.equal(array.GetElementCount(), before);

    // The freed slot is reused first-fit by the next profile.
    const next = profileResource(bakedProfilePayload(50));
    manager.Clear();
    manager.AddLight(lightWith(next));
    manager.ResolveLightData();
    assert.equal(next.GetTextureIndex(), index, "released slice reused");
    next.SetPayload(null);
});

test("foreign profile objects without GetTextureIndex keep the first-sight fallback", () =>
{
    const manager = new Tr2LightManager();
    manager.AddLight(lightWith({ name: "foreign" }));
    manager.ResolveLightData();
    assert.equal(packedProfileSlot(manager), 1, "first-sight slot, biased");
});

test("the element handle class is exported for AL-side consumers", () =>
{
    assert.equal(typeof Tr2TextureArrayElement, "function");
});
