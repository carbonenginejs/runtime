import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2SamplerStateALWebgl2 } from "../../../npm/dist/trinityal/webgl2/index.js";
import { ALResult, Tr2SamplerDescription } from "../../../npm/dist/trinityal/index.js";
import { CompareFunc, TextureAddressMode, TextureFilter } from "../../../npm/dist/global/consts/renderContext/index.js";
import { FakeRenderContext, FakeWebgl2 } from "./fakeWebgl2.js";

function sampled(fields = {})
{
    const { gl, calls } = FakeWebgl2();
    const description = Object.assign(new Tr2SamplerDescription(), fields);
    const sampler = new Tr2SamplerStateALWebgl2();
    const result = sampler.Create(description, FakeRenderContext(gl));
    const parameters = sampler.GetGpuResource()?.parameters;
    return { gl, calls, sampler, result, parameters };
}

test("Carbon's default description is point-sampled and wrapping", () =>
{
    const { gl, sampler, result, parameters } = sampled();

    assert.equal(result, ALResult.S_OK);
    assert.equal(sampler.IsValid(), true);
    assert.equal(parameters.get(gl.TEXTURE_MIN_FILTER), gl.NEAREST_MIPMAP_NEAREST);
    assert.equal(parameters.get(gl.TEXTURE_MAG_FILTER), gl.NEAREST);
    assert.equal(parameters.get(gl.TEXTURE_WRAP_S), gl.REPEAT);
    assert.equal(parameters.has(gl.TEXTURE_COMPARE_MODE), false);
});

test("a trilinear clamped sampler maps onto LINEAR_MIPMAP_LINEAR and CLAMP_TO_EDGE", () =>
{
    const { gl, parameters } = sampled({
        minFilter: TextureFilter.TF_LINEAR,
        magFilter: TextureFilter.TF_LINEAR,
        mipFilter: TextureFilter.TF_LINEAR,
        addressU: TextureAddressMode.TA_CLAMP,
        addressV: TextureAddressMode.TA_MIRROR
    });

    assert.equal(parameters.get(gl.TEXTURE_MIN_FILTER), gl.LINEAR_MIPMAP_LINEAR);
    assert.equal(parameters.get(gl.TEXTURE_MAG_FILTER), gl.LINEAR);
    assert.equal(parameters.get(gl.TEXTURE_WRAP_S), gl.CLAMP_TO_EDGE);
    assert.equal(parameters.get(gl.TEXTURE_WRAP_T), gl.MIRRORED_REPEAT);
});

test("no mip filter pins MaxLOD to MinLOD, as dx11 does", () =>
{
    const { gl, parameters } = sampled({ mipFilter: TextureFilter.TF_NONE, minLOD: 2 });

    assert.equal(parameters.get(gl.TEXTURE_MIN_LOD), 2);
    assert.equal(parameters.get(gl.TEXTURE_MAX_LOD), 2);
});

test("a comparison sampler compares against the reference with Carbon's function", () =>
{
    const { gl, parameters } = sampled({ isComparisonFilter: true, comparisonFunc: CompareFunc.CMP_LESSEQUAL });

    assert.equal(parameters.get(gl.TEXTURE_COMPARE_MODE), gl.COMPARE_REF_TO_TEXTURE);
    assert.equal(parameters.get(gl.TEXTURE_COMPARE_FUNC), 0x0203, "GL LEQUAL");
});

test("anisotropy uses the extension when present, and forceAnisotropy overrides the level", () =>
{
    const { gl } = FakeWebgl2();
    gl.extensions = { EXT_texture_filter_anisotropic: { TEXTURE_MAX_ANISOTROPY_EXT: 0x84fe, MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84ff } };
    gl.getParameter = name => (name === 0x84ff ? 16 : null);

    const description = Object.assign(new Tr2SamplerDescription(), { minFilter: TextureFilter.TF_ANISOTROPIC, maxAnisotropy: 8 });
    const sampler = new Tr2SamplerStateALWebgl2();
    sampler.Create(description, FakeRenderContext(gl));
    assert.equal(sampler.GetGpuResource().parameters.get(0x84fe), 8);

    Tr2SamplerStateALWebgl2.forceAnisotropy = 4;
    try
    {
        const forced = new Tr2SamplerStateALWebgl2();
        forced.Create(description, FakeRenderContext(gl));
        assert.equal(forced.GetGpuResource().parameters.get(0x84fe), 4);
    }
    finally
    {
        Tr2SamplerStateALWebgl2.forceAnisotropy = 0;
    }
});

test("the effect reader's plain spelling - raw float bits and `comparison` - is normalised first", () =>
{
    // Tr2SamplerSetup.fromCarbonBinary's shape: LODs as IEEE bits, the flag as `comparison`.
    // 2.0f is 0x40000000 and 4.0f is 0x40800000.
    const { gl } = FakeWebgl2();
    const sampler = new Tr2SamplerStateALWebgl2();
    const result = sampler.Create({
        comparison: true,
        minFilter: TextureFilter.TF_LINEAR, magFilter: TextureFilter.TF_LINEAR, mipFilter: TextureFilter.TF_LINEAR,
        addressU: TextureAddressMode.TA_CLAMP, addressV: TextureAddressMode.TA_CLAMP, addressW: TextureAddressMode.TA_CLAMP,
        mipLODBiasRaw: 0, maxAnisotropy: 1, comparisonFunc: CompareFunc.CMP_LESSEQUAL,
        borderColorRaw: [ 0, 0, 0, 0 ], minLODRaw: 0x40000000, maxLODRaw: 0x40800000
    }, FakeRenderContext(gl));
    const parameters = sampler.GetGpuResource().parameters;

    assert.equal(result, ALResult.S_OK);
    assert.equal(parameters.get(gl.TEXTURE_MIN_FILTER), gl.LINEAR_MIPMAP_LINEAR);
    assert.equal(parameters.get(gl.TEXTURE_WRAP_S), gl.CLAMP_TO_EDGE);
    assert.equal(parameters.get(gl.TEXTURE_MIN_LOD), 2);
    assert.equal(parameters.get(gl.TEXTURE_MAX_LOD), 4);
    assert.equal(parameters.get(gl.TEXTURE_COMPARE_MODE), gl.COMPARE_REF_TO_TEXTURE);
    assert.equal(parameters.get(gl.TEXTURE_COMPARE_FUNC), 0x0203, "GL LEQUAL");
});

test("an override's plain-float spelling reads the same fields, and no description is refused", () =>
{
    const { gl } = FakeWebgl2();
    const sampler = new Tr2SamplerStateALWebgl2();
    assert.equal(sampler.Create({
        minFilter: TextureFilter.TF_POINT, magFilter: TextureFilter.TF_POINT, mipFilter: TextureFilter.TF_POINT,
        comparison: false, addressU: TextureAddressMode.TA_WRAP, addressV: TextureAddressMode.TA_WRAP,
        addressW: TextureAddressMode.TA_WRAP, mipLODBias: 0, maxAnisotropy: 1, comparisonFunc: CompareFunc.CMP_NEVER,
        borderColor: [ 0, 0, 0, 0 ], minLOD: 1, maxLOD: 3.4028234663852886e38
    }, FakeRenderContext(gl)), ALResult.S_OK);
    const parameters = sampler.GetGpuResource().parameters;

    assert.equal(parameters.get(gl.TEXTURE_MIN_LOD), 1);
    assert.equal(parameters.get(gl.TEXTURE_MAX_LOD), 1000, "FLT_MAX lands on the GL clamp");
    assert.equal(parameters.has(gl.TEXTURE_COMPARE_MODE), false);

    assert.equal(new Tr2SamplerStateALWebgl2().Create(null, FakeRenderContext(gl)), ALResult.E_INVALIDARG);
});
