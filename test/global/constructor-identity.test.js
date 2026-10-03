import { CjsBlueResMan } from "../../npm/dist/global/blue/CjsBlueResMan.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/CjsSchema.js";
import { CjsFormatStore } from "../../npm/dist/global/blue/CjsFormatStore.js";
import { getArrayBufferViewName } from "../../npm/dist/global/utils/bytes.js";
import { carbonValueToJsExpression } from "../../npm/dist/global/schema/types/carbonTypes.js";
import { TriStepRenderTexture } from "../../npm/dist/trinity/renderJob/step/TriStepRenderTexture.js";
import { Tr2RenderTarget } from "../../npm/dist/trinity/core/device/Tr2RenderTarget.js";
import { Tr2DepthStencil } from "../../npm/dist/trinity/core/device/Tr2DepthStencil.js";

test("format routes use declared names and reject unregistered identity", () =>
{
    class a { static className = "RegisteredFixture"; static extensions = [".fixture"]; static read() {} }
    const store = new CjsFormatStore().Register(a);
    assert.equal(store.Get(".fixture")[0].name, "RegisteredFixture.read");
    class b { static extensions = [".fixture"]; static read() {} }
    assert.throws(() => store.Register(b), /schema registration or static className/u);
});

test("render texture dispatch follows Carbon casts even for renamed subclasses", () =>
{
    class a extends Tr2RenderTarget {}
    class b extends Tr2DepthStencil {}
    for (const [source, field] of [[new a(), "renderTarget"], [new b(), "depthStencil"]])
    {
        const step = new TriStepRenderTexture();
        step.__init__(source);
        assert.equal(step[field], source);
        assert.equal(CjsSchema.getClassName(source.constructor), field === "renderTarget" ? "Tr2RenderTarget" : "Tr2DepthStencil");
    }
});

test("typed-array value expressions use intrinsic storage rather than subclass names", () =>
{
    class a extends Float32Array {}
    const value = new a([1, 2]);
    Object.defineProperty(value, "constructor", { value: { name: "Unstable" } });
    assert.equal(getArrayBufferViewName(value), "Float32Array");
    assert.equal(carbonValueToJsExpression(value), "new Float32Array([1, 2])");
    assert.equal(getArrayBufferViewName(new DataView(new ArrayBuffer(4))), "DataView");
    assert.throws(() => getArrayBufferViewName({}), /ArrayBuffer view/u);
});

test("format-cache view identity ignores constructor names but tracks bytes and distinct views", async () =>
{
    let reads = 0;
    class Format
    {
        static className = "ViewIdentityFormat";
        static extensions = [".viewidentity"];
        static outputs = { raw: { output: "raw" } };
        static read() { return { reads: ++reads }; }
    }
    const manager = new CjsBlueResMan({source: { Read: () => new Uint8Array([1]) }}).RegisterFormat(Format);
    const descriptor = manager.GetFormatDescriptors("viewidentity")[0];
    class a extends Uint8Array {}
    const view = new a([1]);
    const formatOptions = { view };
    const options = { emit: "raw", cacheFormat: true, sourceRevision: 1, formatOptions };
    const resource = { GetPath: () => "res:/test.viewidentity" };
    const read = () => manager.ReadFormatOnce(resource, descriptor, new Uint8Array([1]), options);
    try
    {
        const first = await read();
        Object.defineProperty(view, "constructor", {value: {name: "Renamed"}});
        assert.equal(await read(), first);
        view[0] = 2;
        assert.notEqual(await read(), first);
        formatOptions.view = new Uint8Array([2]);
        await read();
        assert.equal(reads, 3);
    }
    finally { manager.Clear(); }
});
