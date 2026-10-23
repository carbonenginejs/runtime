import test from "node:test";
import assert from "node:assert/strict";
import { createDemoSelectionOutline } from "../trinityal/webgpu/demo/demoSelectionOutline.js";
import { EvePlanet, EveSpaceObject2, EveSpaceScene, EveCamera, TriStepRenderObject, Tr2Renderer } from "../../npm/dist/trinity/index.js";
import { Tr2TextureAL } from "../../npm/dist/trinityal/index.js";
import { Tr2Effect } from "../../npm/dist/trinity/shader/index.js";
import { ShaderStageType } from "../../npm/dist/resource/shader/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

async function fixture(t, selected = true, planetEffect = null)
{
    let view = mat4.create(), projection = mat4.create();
    view[12] = 4e6; view[13] = -2e6; view[14] = -9e6;
    projection[0] = 2; projection[5] = 3;
    EveCamera.ModifyClipPlanes(projection, 10, 1e7, projection);
    const initialView = [...view], initialProjection = [...projection];
    t.mock.method(Tr2Renderer, "GetViewTransform", () => view);
    t.mock.method(Tr2Renderer, "SetViewTransform", value => { view = new Float32Array(value); });
    t.mock.method(Tr2Renderer, "GetProjectionTransform", () => projection);
    t.mock.method(Tr2Renderer, "SetProjectionTransform", value => { projection = new Float32Array(value); });
    t.mock.method(Tr2Renderer, "GetReversedDepthProjectionTransform", out => {
        out.set(projection); out[10] = -out[10] - 1; out[14] = -out[14]; return out;
    });
    t.mock.method(Tr2Renderer, "drawScreenQuad", () => {});
    t.mock.method(Tr2TextureAL.prototype, "Create__GpuUsage", () => {});
    t.mock.method(Tr2TextureAL.prototype, "GetWidth", () => 640);
    t.mock.method(Tr2TextureAL.prototype, "GetHeight", () => 480);
    t.mock.method(Tr2TextureAL.prototype, "Destroy", () => {});
    const scene = new EveSpaceScene();
    scene.projection.set(projection); scene.planetCameraScale = 2e6;
    scene.jitter[0] = 0.001; scene.jitter[1] = -0.002;
    scene.jitterMatrix[12] = scene.jitter[0]; scene.jitterMatrix[13] = scene.jitter[1];
    const frames = [];
    t.mock.method(scene, "PopulateAndApplyPerFrameData", () => frames.push({ view: [...view], projection: [...projection] }));
    t.mock.method(scene, "PickObject", async () => null);
    const planet = new EvePlanet();
    const children = [{ name: "surface" }, { name: "secondary" }];
    t.mock.method(planet, "GetRenderables", out => out.push(...children));
    const draws = [], clears = [], events = {}, effects = [];
    let fail = false, object = planet;
    t.mock.method(TriStepRenderObject.prototype, "Execute", function() {
        draws.push({ object: this.renderable, effect: this.effectOverride, view: [...view], projection: [...projection] });
        if (fail) throw new Error("draw failed");
    });
    const target = { addEventListener: (name, fn) => { events[name] = fn; }, removeEventListener() {},
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 320, height: 240 }) };
    const driver = { _PostProcess() {}, _BeginRenderPass() {} };
    const material = async path => {
        if (planetEffect && path.includes("planet_selectionmask")) return planetEffect;
        const values = {};
        const effect = { path, values, AddParameterVector4: (name, value) => { values[name] = [...value]; },
            AddParameterColor() {}, RebuildCachedData() {}, SetParameter__Vector4: (name, value) => { values[name] = [...value]; }, SetParameter__TextureAL() {} };
        effects.push(effect); return effect;
    };
    const outline = createDemoSelectionOutline({ canvas: { width: 640, height: 480 }, target, driver,
        getScene: () => scene, getView: () => ({ view, projection }), material, effectPath: x => x,
        getObject: selected ? () => object : null });
    await outline.loading;
    t.after(() => outline.dispose());
    const texture = { GetWidth: () => 640, GetHeight: () => 480 };
    const context = { GetEffectStateManager: () => ({ SetRenderTarget() {}, SetDepthStencilBuffer() {} }), GetProjection: () => projection, SetProjection: value => { projection = new Float32Array(value); }, Clear: value => clears.push(value) };
    return { outline, planet, scene, children, draws, clears, frames, events, effects, initialView, initialProjection,
        getView: () => [...view], getProjection: () => [...projection],
        draw: () => driver._PostProcess(texture, { depth: { Get: () => texture } }, context),
        fail: () => { fail = true; }, select: value => { object = value; } };
}

test("planet masks draw native children at planet camera scale and restore the main camera", async t => {
    const f = await fixture(t); f.draw();
    assert.deepEqual(f.draws.map(d => d.object), [...f.children, ...f.children]);
    assert.deepEqual(f.draws[0].view.slice(12, 15), [2, -1, -4.5]);
    assert.match(f.draws[0].effect.path, /selectionsilhouette/);
    assert.match(f.draws[2].effect.path, /planet_selectionmask/);
    assert.notDeepEqual(f.draws[0].projection, f.draws[2].projection, "visibility is jittered; silhouette is stable");
    assert.deepEqual(f.getView(), f.initialView);
    assert.deepEqual(f.getProjection(), f.initialProjection);
    assert.deepEqual(f.frames.at(-1).view, f.initialView);
    assert.ok(f.clears.every(clear => clear.clearColor && !clear.clearDepth), "preserve scene depth");

    const [factor, offset] = f.draws[2].effect.values.SelectionDepthRemap;
    const p = f.draws[2].projection;
    const reverse = matrix => [-Math.fround(-matrix[10] - 1), Math.fround(-matrix[14])];
    const [mainA, mainB] = reverse(f.initialProjection), [planetA, planetB] = reverse(p);
    for (const distance of [1e4, 1e5, 1e6, 9e6, 1e7, 1e8]) {
        const nativeDepth = planetA + planetB / (distance / f.scene.planetCameraScale);
        const converted = Math.max(0, Math.min(1, nativeDepth * factor + offset));
        const expected = Math.max(0, Math.min(1, mainA + mainB / distance));
        assert.ok(Math.abs(converted - expected) < 1e-12, String(distance));
        const foreground = mainA + mainB / (distance * 0.9995);
        if (foreground > 0) assert.ok(foreground > converted, "foreground must occlude without a planetary bias");
    }
});

test("a failed planet draw restores renderer matrices and per-frame data", async t => {
    const f = await fixture(t); f.fail();
    assert.throws(f.draw, /draw failed/);
    assert.deepEqual(f.getView(), f.initialView);
    assert.deepEqual(f.getProjection(), f.initialProjection);
    assert.deepEqual(f.frames.at(-1).projection, f.initialProjection);
});

test("hover uses the shared planet picker in backing pixels and accepts planets", async t => {
    const f = await fixture(t, false); const picks = [];
    f.outline.setPickObject(async (x, y, view) => { picks.push([x, y, view.viewport.width, view.viewport.height]); return f.planet; });
    f.events.pointermove({ clientX: 110, clientY: 70, buttons: 0 });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(picks, [[200, 100, 640, 480]]);
    assert.equal(f.outline.hovered, f.planet);
    f.draw(); assert.equal(f.draws.length, 4);
    f.events.pointerleave({ buttons: 0 }); assert.equal(f.outline.hovered, null);
});

test("ordinary selected ships retain the existing main-view mask path", async t => {
    const f = await fixture(t); const ship = new EveSpaceObject2(); f.select(ship); f.draw();
    assert.deepEqual(f.draws.map(draw => draw.object), [ship, ship]);
    assert.match(f.draws[1].effect.path, /\/selectionmask\.fx$/);
    assert.deepEqual(f.draws[1].view, f.initialView);
    assert.deepEqual(f.getProjection(), f.initialProjection);
});


test("planet remap remains a live Tr2Effect binding when the camera changes", async t => {
    const effect = new Tr2Effect();
    const constant = { name: "SelectionDepthRemap", offset: 0, size: 16, isSRGB: false };
    const stageInputs = [];
    stageInputs[ShaderStageType.PIXEL_SHADER] = {
        exists: true, constants: [constant], resources: new Map(), uavs: new Map(), samplers: new Map(),
        constantValues: new Uint8Array(16), GetConstantBufferSize: () => 16
    };
    effect.shader = {
        GetEffect: () => ({ techniques: [{ passes: [{ stageInputs, resourceSetDesc: null, renderStateValues: [], stageOrder: [] }] }] }),
        GetConstant: name => name === constant.name ? constant : null, ProcessEffect() {}
    };
    const f = await fixture(t, true, effect);
    assert.equal(effect.constParameters.length, 0, "authored constants would shadow the per-frame remap");
    const input = effect.parametersForPasses[0].passes[0].stageInput[ShaderStageType.PIXEL_SHADER];
    const bindings = [...input.shaderParameters, ...input.shaderParametersWithNotification];
    assert.equal(bindings.length, 1, "the real effect must bind a changing value rather than bake zero");
    const [binding] = bindings;
    const mirror = new Float32Array(input.constantMirror.buffer, input.constantMirror.byteOffset + binding.registerIndex, 4);
    f.draw();
    binding.sourceValue.CopyValueToEffect(ShaderStageType.PIXEL_SHADER, mirror);
    const first = [...mirror];
    assert.ok(first[0] > 0);
    f.scene.planetCameraScale *= 2;
    f.draw();
    binding.sourceValue.CopyValueToEffect(ShaderStageType.PIXEL_SHADER, mirror);
    assert.equal(mirror[0], first[0] / 2, "the existing GPU constant mapping receives the next camera's remap");
});
