import assert from "node:assert/strict";
import { test } from "node:test";

import {
    CARBON_VIEW_FORMAT_ANNOTATION,
    annotatedViewFormat,
    typedViewsFor
} from "../../../../../src/resource/formats/hlsl/core/carbonTypedViews.js";

const annotation = (stringValue, type = 3) => ({ name: CARBON_VIEW_FORMAT_ANNOTATION, type, stringValue });

test("typed views come from Carbon parameter names, keyed by D3D identity", () =>
{
    assert.deepEqual(typedViewsFor([
        { kind: "resource", metadataName: "Exposure", registerIndex: 9, registerSpace: 0 },
        { kind: "uav", metadataName: "CooldownMap", registerIndex: 1 },
        { kind: "resource", metadataName: "BlitCurrent", registerIndex: 1 },
        { kind: "sampler", metadataName: "Exposure", registerIndex: 0 }
    ]), {
        "sampled-resource:0:9": "R32_FLOAT",
        "storage-resource:0:1": "R32_UINT"
    });
});

test("a parameter's CjsViewFormat annotation wins over the table", () =>
{
    assert.deepEqual(typedViewsFor([
        { kind: "resource", metadataName: "Exposure", registerIndex: 0, annotations: [ annotation("R32_UINT") ] },
        { kind: "resource", metadataName: "Unlisted", registerIndex: 1, annotations: [ annotation("R32_FLOAT") ] }
    ]), {
        "sampled-resource:0:0": "R32_UINT",
        "sampled-resource:0:1": "R32_FLOAT"
    });
});

test("an unknown format or a non-string annotation is not a view format", () =>
{
    assert.equal(annotatedViewFormat([ annotation("R8G8B8A8_UNORM") ]), null);
    assert.equal(annotatedViewFormat([ annotation("R32_FLOAT", 0) ]), null);
    assert.equal(annotatedViewFormat([]), null);
});

test("a scalar typed-buffer load widens to four components before its swizzle", async () =>
{
    const { typedBufferLoad } = await import("../../../../../src/resource/formats/webgpu/core/wgsl/wgslTypedViews.js");

    // D3D's ld returns four components: a single-channel element is (x, 0, 0, 1),
    // so the instruction's `.x` lands on a vector, not "cannot index into u32".
    assert.equal(
        typedBufferLoad("u32", "t0", "i", "n"),
        "select(vec4<u32>(), vec4<u32>(t0[min(i, n - 1u)], 0u, 0u, 1u), i < n)"
    );
    assert.equal(
        typedBufferLoad("f32", "t0", "i", "n"),
        "select(vec4<f32>(), vec4<f32>(t0[min(i, n - 1u)], 0.0, 0.0, 1.0), i < n)"
    );

    // A vector element is already four components.
    assert.equal(typedBufferLoad("vec4<f32>", "t0", "i", "n"), "select(vec4<f32>(), t0[min(i, n - 1u)], i < n)");
});
