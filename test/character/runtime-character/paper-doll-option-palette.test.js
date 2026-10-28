import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { CjsPaperDollDefinition, PaperDollPass } from "../../../npm/dist/character/index.js";

test("component fields are independent engine inputs and schema notification only dirties", () =>
{
    const component = new CjsPaperDollDefinition().bottomOuter;
    component.Configure([{ id: "pants", colorAreas: [1], defaultPalette: "authored" }],
        new Map([["authored", [0, 1, 2].map(() => Float32Array.of(.1, .2, .3, 1))]]));
    component.ClearDirty();
    component.option = "pants";
    assert.equal(component.IsDirty(), false, "ordinary writes are not intercepted");
    assert.equal(component.palette, "");
    assert.equal(component.color1[0], .5);

    component.customColors = true;
    const color = component.color1;
    CjsSchema.setValues(component, { palette: "authored" });
    assert.equal(component.IsDirty(), true);
    assert.equal(component.customColors, true, "notification applies no palette convenience");
    assert.strictEqual(component.color1, color);
    assert.equal(component.color1[0], .5);
    component.ClearDirty();
    CjsSchema.setValues(component, { palette: "authored" });
    assert.equal(component.IsDirty(), false, "an equal schema write does not rebuild");
});

test("direct colour replacement is captured without enabling custom colours", () =>
{
    const component = new CjsPaperDollDefinition().eyes;
    component.Configure([{ id: "eyes", colorAreas: [1, 2, 3] }], new Map(), { option: "eyes" });
    component.color1 = Float32Array.of(.1, .2, .3, 1);
    component.palette = "palette-input";
    const state = component.Capture();
    assert.deepEqual(Object.keys(state), ["option", "colors", "colorAreas", "palette"]);
    assert.deepEqual(state.colors[0], component.color1);
    assert.notStrictEqual(state.colors[0], component.color1);
    assert.equal(component.customColors, false);
    assert.equal(state.palette, "palette-input");
    component.color1[0] = 1;
    assert.notEqual(state.colors[0][0], 1);
    component.enabled = false;
    assert.deepEqual(component.Capture().colorAreas, []);
    assert.equal(component.Capture().option, "");
    assert.equal(component.Capture().palette, "");
});

test("component inputs do not validate assignments or select other fields", () =>
{
    const doll = new CjsPaperDollDefinition();
    doll.blush.option = "unknown";
    doll.blush.weight = 9;
    doll.blush.enabled = "caller-bug";
    doll.blush.color1 = [1, 2];
    doll.archetype.option = "unprepared";
    doll.archetype.strength = -1;
    assert.equal(doll.blush.option, "unknown");
    assert.equal(doll.blush.weight, 9);
    assert.equal(doll.blush.enabled, "caller-bug");
    assert.deepEqual(doll.blush.color1, [1, 2]);
    assert.equal(doll.archetype.strength, -1);
});

test("archetype notifications distinguish foundation and shape inputs", () =>
{
    const component = new CjsPaperDollDefinition().archetype;
    component.ClearDirty();
    CjsSchema.setValues(component, { strength: .5 });
    assert.equal(component.IsDirty(), true);
    assert.equal(component.IsFoundationDirty(), false);
    component.ClearDirty();
    CjsSchema.setValues(component, { option: "foundation-input" });
    assert.equal(component.IsDirty(), true);
    assert.equal(component.IsFoundationDirty(), true);
});

test("lipstick surface capture keeps its palette with custom diffuse inputs", () =>
{
    const component = new CjsPaperDollDefinition().lipstick;
    component.Configure([{ id: "lip", colorAreas: [1] }], new Map(), { option: "lip" });
    component.customColors = true;
    component.palette = "gloss";
    assert.equal(component.Capture(PaperDollPass.HEAD).palette, "");
    assert.deepEqual(component.Capture(PaperDollPass.SURFACE), {
        option: "lip", palette: "gloss", colorAreas: [], colors: []
    });
});
