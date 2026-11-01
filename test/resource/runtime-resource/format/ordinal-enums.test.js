import assert from "node:assert/strict";
import test from "node:test";
import { blueEnums } from "../../../../npm/dist/blue/blue/enums/CjsBlueEnumRegistry.js";
import "../../../../npm/dist/resource/format/carbonEffect/carbonEffectBackendBlock.js";

test("CARBON_BACKEND_RESOURCE_KIND preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.carbonEffect.CARBON_BACKEND_RESOURCE_KIND");
    const originalNames = ["uniform-buffer","sampled-resource","sampler","storage-resource"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.carbonEffect.CARBON_BACKEND_RESOURCE_KIND", index), name);
    }
});

test("CARBON_BACKEND_TEXTURE_SAMPLE_TYPE preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.carbonEffect.CARBON_BACKEND_TEXTURE_SAMPLE_TYPE");
    const originalNames = ["float","unfilterable-float","depth","uint","sint"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.carbonEffect.CARBON_BACKEND_TEXTURE_SAMPLE_TYPE", index), name);
    }
});

test("CARBON_BACKEND_SAMPLER_BINDING_TYPE preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.carbonEffect.CARBON_BACKEND_SAMPLER_BINDING_TYPE");
    const originalNames = ["filtering","non-filtering","comparison"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.carbonEffect.CARBON_BACKEND_SAMPLER_BINDING_TYPE", index), name);
    }
});

test("CARBON_BACKEND_VISIBILITY preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.carbonEffect.CARBON_BACKEND_VISIBILITY");
    const originalNames = ["vertex","fragment","compute"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.carbonEffect.CARBON_BACKEND_VISIBILITY", index), name);
    }
});
