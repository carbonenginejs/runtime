import assert from "node:assert/strict";
import test from "node:test";
import { blueEnums } from "../../../../../npm/dist/blue/blue/enums/CjsBlueEnumRegistry.js";
import "../../../../../npm/dist/resource/formats/webgl/core/glslBackendBlock.js";

test("GLSL_BACKEND_STAGE preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.webgl.GLSL_BACKEND_STAGE");
    const originalNames = ["vertex","pixel","compute"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.webgl.GLSL_BACKEND_STAGE", index), name);
    }
});

test("GLSL_BACKEND_BINDING_KIND preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.webgl.GLSL_BACKEND_BINDING_KIND");
    const originalNames = ["constantBuffer","resource","bufferTexture","structuredTexture","structuredUbo","uavTexture","dispatchUniform"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.webgl.GLSL_BACKEND_BINDING_KIND", index), name);
    }
});

test("GLSL_BACKEND_CONSTANT_BUFFER_STYLE preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.webgl.GLSL_BACKEND_CONSTANT_BUFFER_STYLE");
    const originalNames = ["array","std140"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.webgl.GLSL_BACKEND_CONSTANT_BUFFER_STYLE", index), name);
    }
});

test("GLSL_BACKEND_BUFFER_TEXTURE_FORMAT preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.webgl.GLSL_BACKEND_BUFFER_TEXTURE_FORMAT");
    const originalNames = ["RGBA32F","R32F","R32UI"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.webgl.GLSL_BACKEND_BUFFER_TEXTURE_FORMAT", index), name);
    }
});

test("GLSL_LOCAL_LIGHT_ROLE preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.webgl.GLSL_LOCAL_LIGHT_ROLE");
    const originalNames = ["packed-texture","constant-buffer"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.webgl.GLSL_LOCAL_LIGHT_ROLE", index), name);
    }
});

test("EMITTER_LIGHT_SEMANTIC preserves every original ordinal wire value", () =>
{
    const values = blueEnums.GetEnum("resource.webgl.EMITTER_LIGHT_SEMANTIC");
    const originalNames = ["packedLocalLights","localLights"];
    assert.equal(Object.keys(values).length, originalNames.length);
    for (const [index, name] of originalNames.entries())
    {
        assert.equal(values[name], index, name);
        assert.equal(blueEnums.GetNameFromValue("resource.webgl.EMITTER_LIGHT_SEMANTIC", index), name);
    }
});
