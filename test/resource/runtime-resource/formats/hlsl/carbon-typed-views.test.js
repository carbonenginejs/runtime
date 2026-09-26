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
