import assert from "node:assert/strict";
import test from "node:test";
import { blueEnums } from "../../../../../npm/dist/blue/blue/enums/CjsBlueEnumRegistry.js";
import "../../../../../npm/dist/resource/formats/cmf/core/constants.js";

test("Usage preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.cmf.Usage");
    const originalNames = ["Position","Normal","Tangent","Binormal","TexCoord","Color","BoneIndices","BoneWeights","PackedTangent","PackedTangentLegacy"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.cmf.Usage", index), name);
    }
});

test("ElementType preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.cmf.ElementType");
    const originalNames = ["Float32","Float16","UInt16Norm","UInt16","Int16Norm","Int16","UInt8Norm","UInt8","Int8Norm","Int8"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.cmf.ElementType", index), name);
    }
});

test("MeshTopology preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.cmf.MeshTopology");
    const originalNames = ["TriangleList","PointList"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.cmf.MeshTopology", index), name);
    }
});

test("SectionType preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.cmf.SectionType");
    const originalNames = ["Data","GpuBuffer","Metadata"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.cmf.SectionType", index), name);
    }
});

test("SectionCompression preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.cmf.SectionCompression");
    const originalNames = ["None","MeshOptimizerVertexBuffer","MeshOptimizerIndexBuffer"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.cmf.SectionCompression", index), name);
    }
});

test("AnimationChannelTargetType preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.cmf.AnimationChannelTargetType");
    const originalNames = ["BonePosition","BoneRotation","BoneScale","MorphTarget","Other"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.cmf.AnimationChannelTargetType", index), name);
    }
});

test("Interpolation preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.cmf.Interpolation");
    const originalNames = ["Step","Linear"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.cmf.Interpolation", index), name);
    }
});
