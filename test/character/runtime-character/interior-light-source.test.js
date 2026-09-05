import test from "node:test";
import assert from "node:assert/strict";
import {
    Tr2InteriorLightSource,
    Tr2InteriorPerObjectLightData
} from "../../../npm/dist/character/index.js";
import { Tr2KelvinColor, TriFrustum, Tr2TexturedPointLight } from "../../../npm/dist/trinity/index.js";

/**
 * Tr2InteriorLightSource.cpp behaviours: PopulateLightData (cpp:100-138),
 * Initialize/OnModified bounds (cpp:59-63, 77-92), IsInFrustum
 * (cpp:154-162), Update curve tick (cpp:146-152); and Tr2TexturedPointLight
 * .cpp: SetTexturePath/Update (cpp:31-35, 51-56) with Carbon's Saturate
 * (Color_inline.h:161 - a grey lerp, not a clamp).
 */

test("PopulateLightData ports Carbon's exact field rules", () =>
{
    const source = new Tr2InteriorLightSource();
    source.SetValues({
        position: [ 1, 2, 3 ],
        radius: -5, // negative means box light; the record clamps at zero
        color: [ 0.5, 1, 0.25, 1 ],
        falloff: 3,
        coneAlphaOuter: 45, // < 89: a spotlight
        coneAlphaInner: 44.5, // clamps to outer - 1 = 44
        coneDirection: [ 0, 0, 2 ]
    });

    const data = new Tr2InteriorPerObjectLightData();
    source.PopulateLightData(data);

    assert.deepEqual([ ...data.position ], [ 1, 2, 3 ]);
    assert.equal(data.radius, 0, "negative radius clamps at zero");
    // Gamma 2.2 linearize, unconditionally.
    assert.ok(Math.abs(data.color[0] - Math.pow(0.5, 2.2)) < 1e-6);
    assert.equal(data.color[1], 1);
    assert.equal(data.pointLightFalloff, 3);
    assert.equal(data.shadow0Influence, 0);
    assert.equal(data.shadow1Influence, 0);
    // cos(45deg) and cos(44deg) - the inner clamp applied BEFORE the test.
    assert.ok(Math.abs(data.coneCosAlphaOuter - Math.cos(45 * Math.PI / 180)) < 1e-6);
    assert.ok(Math.abs(data.coneCosAlphaInner - Math.cos(44 * Math.PI / 180)) < 1e-6);
    assert.ok(Math.abs(data.spotDirection[2] - 1) < 1e-6, "cone direction normalized");

    // A non-spot (outer >= 89) forces BOTH angles to 360 degrees.
    source.SetValues({ coneAlphaOuter: 180, coneAlphaInner: 10 });
    source.PopulateLightData(data);
    const cos360 = Math.cos(360 * Math.PI / 180);
    assert.ok(Math.abs(data.coneCosAlphaOuter - cos360) < 1e-6);
    assert.ok(Math.abs(data.coneCosAlphaInner - cos360) < 1e-6);
});

test("kelvin colour wins when enabled, linearized like the rgb path", () =>
{
    const source = new Tr2InteriorLightSource();
    const kelvin = new Tr2KelvinColor();
    source.SetValues({ useKelvinColor: true });
    source.kelvinColor = kelvin;

    const expected = kelvin.GetColor();
    const data = new Tr2InteriorPerObjectLightData();
    source.PopulateLightData(data);
    assert.ok(Math.abs(data.color[0] - Math.pow(expected[0], 2.2)) < 1e-6);
    assert.ok(Math.abs(data.color[2] - Math.pow(expected[2], 2.2)) < 1e-6);
});

test("IsInFrustum gates on primaryLighting and tests the position box", () =>
{
    const source = new Tr2InteriorLightSource();
    source.SetValues({ position: [ 10, 0, 0 ], radius: 2 });
    source.Initialize();

    const calls = [];
    const frustum = new (class extends TriFrustum
    {
        IsBoxVisible(min, max)
        {
            calls.push([ [ ...min ], [ ...max ] ]);
            return true;
        }
    })();

    const out = new Float32Array(16);
    assert.equal(source.IsInFrustum(frustum, out), true);
    assert.deepEqual(calls[0], [ [ 8, -2, -2 ], [ 12, 2, 2 ] ], "box is position +- radius");
    assert.equal(out[12], 10, "out matrix carries the translation");

    source.SetValues({ primaryLighting: false });
    assert.equal(source.IsInFrustum(frustum), false, "non-primary lights are never in frustum");
});

test("Update forwards time to every curve set", () =>
{
    const source = new Tr2InteriorLightSource();
    const times = [];
    source.curveSets.push({ Update: t => times.push(t) }, { Update: t => times.push(t * 2) });
    source.Update(1.5);
    assert.deepEqual(times, [ 1.5, 3 ]);
});

test("the textured point light saturates the texture's average colour", () =>
{
    const light = new Tr2TexturedPointLight();
    light.texture = { GetAverageColor: () => [ 1, 0, 0, 1 ] };
    light.SetSaturation(0.5);
    light.Update();

    // Carbon Saturate: lerp from perceived-intensity grey toward the colour.
    const grey = 1 * 0.299;
    assert.ok(Math.abs(light.color[0] - (grey + (1 - grey) * 0.5)) < 1e-6);
    assert.ok(Math.abs(light.color[1] - (grey + (0 - grey) * 0.5)) < 1e-6);
    assert.equal(light.color[3], 1, "alpha carries through the grey endpoint");

    // No texture, or a resource without the capability: colour untouched.
    const before = [ ...light.color ];
    light.texture = {};
    light.Update();
    assert.deepEqual([ ...light.color ], before);
});
