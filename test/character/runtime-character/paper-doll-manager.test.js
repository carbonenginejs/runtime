import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDoll, CjsPaperDollDefinition, CjsPaperDollInstance, CjsPaperDollManager } from "../../../npm/dist/character/index.js";

/** Records which dynamics a manager adds and removes. */
function Scene()
{
    const dynamics = [];
    return { dynamics, AddDynamic(value) { dynamics.push(value); }, RemoveDynamic(value) { dynamics.splice(dynamics.indexOf(value), 1); } };
}

/** Bindings that record the lipstick option each head pass received. */
function Bindings()
{
    const heads = [];
    return { heads, foundation() {}, skin() {}, surface() {}, eyes() {}, body() {}, head(value) { heads.push(value.lipstick.option); } };
}

/** A doll with one lipstick style and a built front instance drawing one object. */
function Doll(object)
{
    const doll = new CjsPaperDoll();
    doll.definition.lipstick.Configure([ { id: "lipstick_01", colorAreas: [] } ], new Map(), { option: "" });
    const bindings = Bindings();
    doll.front = new CjsPaperDollInstance(bindings, [ object ]);
    return { doll, bindings };
}

test("a doll without a front instance updates nothing", () =>
{
    const doll = new CjsPaperDoll();
    assert.ok(doll.definition instanceof CjsPaperDollDefinition);
    assert.equal(doll.back, null);
    assert.equal(doll.Update(), false);
});

test("the manager puts each doll's objects in its scene and takes them out again", () =>
{
    const scene = Scene();
    const manager = new CjsPaperDollManager(scene);
    const first = Doll("first"), second = Doll("second");
    manager.AddDoll(first.doll);
    manager.AddDoll(second.doll);
    assert.deepEqual(scene.dynamics, [ "first", "second" ]);
    assert.throws(() => manager.AddDoll(first.doll), /already/);
    assert.throws(() => manager.AddDoll(new CjsPaperDoll()), /front instance/);

    manager.RemoveDoll(first.doll);
    assert.deepEqual(scene.dynamics, [ "second" ]);
    assert.deepEqual(manager.dolls, [ second.doll ]);
    assert.throws(() => manager.RemoveDoll(first.doll), /not in this manager/);
});

test("two dolls build from their own definitions: an edit to one never reaches the other", () =>
{
    const manager = new CjsPaperDollManager(Scene());
    const first = Doll("first"), second = Doll("second");
    manager.AddDoll(first.doll);
    manager.AddDoll(second.doll);
    manager.Update();
    first.bindings.heads.length = second.bindings.heads.length = 0;

    CjsSchema.setValues(first.doll.definition.lipstick, { option: "lipstick_01" });
    assert.equal(manager.Update(), true);
    assert.deepEqual(first.bindings.heads, [ "lipstick_01" ]);
    assert.deepEqual(second.bindings.heads, [], "the other doll's head pass did not run");
    assert.equal(manager.Update(), false, "nothing is pending afterwards");
});
