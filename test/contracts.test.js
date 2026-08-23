import assert from "node:assert/strict";
import test from "node:test";
import {
    CjsBackendCandidate,
    CjsConstantPayload
} from "@carbonenginejs/runtime-utils/contracts";

test("backend candidates require a concrete proof implementation", async () =>
{
    assert.throws(
        () => new CjsBackendCandidate().Prove({}),
        /CjsBackendCandidate\.Prove/u
    );

    const context = {};
    const proof = {};

    class TestBackendCandidate extends CjsBackendCandidate
    {

        name = "test";

        limits = Object.freeze({ maxTextures: 8 });

        features = Object.freeze([ "example" ]);

        async Prove(value)
        {
            assert.equal(value, context);
            return proof;
        }

    }

    const candidate = new TestBackendCandidate();

    assert.ok(candidate instanceof CjsBackendCandidate);
    assert.equal(candidate.name, "test");
    assert.equal(candidate.limits.maxTextures, 8);
    assert.deepEqual(candidate.features, [ "example" ]);
    assert.equal(await candidate.Prove(context), proof);
});

test("constant payloads require data and dirty-lifecycle implementations", () =>
{
    const payload = new CjsConstantPayload();

    assert.throws(() => payload.GetData(), /CjsConstantPayload\.GetData/u);
    assert.throws(() => payload.IsDirty(), /CjsConstantPayload\.IsDirty/u);
    assert.throws(() => payload.ClearDirty(), /CjsConstantPayload\.ClearDirty/u);
});

test("concrete constant payloads retain byte identity and clear dirty state", () =>
{
    class TestConstantPayload extends CjsConstantPayload
    {

        #data = new Float32Array([ 1, 2, 3, 4 ]);

        #dirty = true;

        GetData()
        {
            return this.#data;
        }

        IsDirty()
        {
            return this.#dirty;
        }

        ClearDirty()
        {
            this.#dirty = false;
            return this;
        }

    }

    const payload = new TestConstantPayload();
    const data = payload.GetData();

    assert.ok(payload instanceof CjsConstantPayload);
    assert.equal(payload.GetData(), data);
    assert.equal(payload.IsDirty(), true);
    assert.equal(payload.ClearDirty(), payload);
    assert.equal(payload.IsDirty(), false);
});
