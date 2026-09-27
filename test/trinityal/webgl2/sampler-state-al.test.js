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
        m_minFilter: TextureFilter.TF_LINEAR,
        m_magFilter: TextureFilter.TF_LINEAR,
        m_mipFilter: TextureFilter.TF_LINEAR,
        m_addressU: TextureAddressMode.TA_CLAMP,
        m_addressV: TextureAddressMode.TA_MIRROR
    });

    assert.equal(parameters.get(gl.TEXTURE_MIN_FILTER), gl.LINEAR_MIPMAP_LINEAR);
    assert.equal(parameters.get(gl.TEXTURE_MAG_FILTER), gl.LINEAR);
    assert.equal(parameters.get(gl.TEXTURE_WRAP_S), gl.CLAMP_TO_EDGE);
    assert.equal(parameters.get(gl.TEXTURE_WRAP_T), gl.MIRRORED_REPEAT);
});

test("no mip filter pins MaxLOD to MinLOD, as dx11 does", () =>
{
    const { gl, parameters } = sampled({ m_mipFilter: TextureFilter.TF_NONE, m_minLOD: 2 });

    assert.equal(parameters.get(gl.TEXTURE_MIN_LOD), 2);
    assert.equal(parameters.get(gl.TEXTURE_MAX_LOD), 2);
});

test("a comparison sampler compares against the reference with Carbon's function", () =>
{
    const { gl, parameters } = sampled({ m_isComparisonFilter: true, m_comparisonFunc: CompareFunc.CMP_LESSEQUAL });

    assert.equal(parameters.get(gl.TEXTURE_COMPARE_MODE), gl.COMPARE_REF_TO_TEXTURE);
    assert.equal(parameters.get(gl.TEXTURE_COMPARE_FUNC), 0x0203, "GL LEQUAL");
});

test("anisotropy uses the extension when present, and forceAnisotropy overrides the level", () =>
{
    const { gl } = FakeWebgl2();
    gl.extensions = { EXT_texture_filter_anisotropic: { TEXTURE_MAX_ANISOTROPY_EXT: 0x84fe, MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84ff } };
    gl.getParameter = name => (name === 0x84ff ? 16 : null);

    const description = Object.assign(new Tr2SamplerDescription(), { m_minFilter: TextureFilter.TF_ANISOTROPIC, m_maxAnisotropy: 8 });
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
