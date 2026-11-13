import assert from "node:assert/strict";
import test from "node:test";
import { CjsLibrary } from "../../npm/dist/core/CjsLibrary.js";
import { TnyShip } from "../../npm/dist/wrap/objects/TnyShip.js";
import { TnyMobile } from "../../npm/dist/wrap/objects/TnyMobile.js";
import { TnyStationary } from "../../npm/dist/wrap/objects/TnyStationary.js";
import { EveStation2 } from "../../npm/dist/trinity/eve/spaceObject/EveStation2.js";
import { EveMobile } from "../../npm/dist/trinity/eve/spaceObject/EveMobile.js";
import { TnyScene } from "../../npm/dist/wrap/TnyScene.js";
import { EveShip2 } from "../../npm/dist/trinity/eve/spaceObject/EveShip2.js";
import { EveSpaceScene } from "../../npm/dist/trinity/eve/scene/EveSpaceScene.js";
import { Tr2StateMachine } from "../../npm/dist/trinity/controllers/state/Tr2StateMachine.js";
import { Tr2ActionSetValue } from "../../npm/dist/trinity/controllers/action/Tr2ActionSetValue.js";
import { Tr2StateMachineState } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineState.js";
import { Tr2StateMachineTransition } from "../../npm/dist/trinity/controllers/state/Tr2StateMachineTransition.js";
import { Tr2ActionPlayMeshAnimation } from "../../npm/dist/trinity/controllers/action/Tr2ActionPlayMeshAnimation.js";
import { Tr2Controller } from "../../npm/dist/trinity/controllers/Tr2Controller.js";
import { Tr2ControllerFloatVariable } from "../../npm/dist/trinity/controllers/expression/Tr2ControllerFloatVariable.js";
import { dirtLevelFromWeeks } from "../../npm/dist/wrap/objects/TnySpaceObject.js";
import { Tr2PostProcess2 } from "../../npm/dist/trinity/postProcess/Tr2PostProcess2.js";

test("mobile wrapper teardown visits slots before detaching base listeners", () =>
{
    const mobile = new TnyMobile();
    const listener = () => {};
    mobile._onModified = mobile._onTypeInfoModified = listener;
    let slotCalls = 0;
    mobile.slots = [{ Destruct()
    {
        assert.equal(mobile._onModified, listener, "derived slots retire before base listener cleanup");
        slotCalls++;
    } }];
    mobile.Destruct();
    assert.equal(slotCalls, 1);
    assert.equal(mobile._onModified, null);
    assert.equal(mobile._onTypeInfoModified, null);
});

test("ship acquisition preserves the library contract and starts controllers without reinitializing", async t =>
{
    const library = new CjsLibrary(), ship = new EveShip2();
    t.after(() => library.Shutdown());
    await library.Initialize({ sof: null, characterLibrary: null });
    const fetch = t.mock.method(library, "Fetch", async (source, received) =>
    {
        assert.equal(source, "hull:faction:race");
        assert.deepEqual(received, { awaitResources: true });
        return ship;
    });
    const start = t.mock.method(ship, "StartControllers");
    t.mock.method(ship, "Initialize", () => assert.fail("the library already initialized the graph"));
    t.mock.method(library, "Initialize", () => assert.fail("the wrapper borrows its library"));
    const shutdown = t.mock.method(library, "Shutdown");

    const wrapper = await TnyShip.fetch({ dna: "hull:faction:race", awaitResources: true, name: "Rifter" });
    assert.equal(wrapper.wrapped, ship);
    assert.equal(ship.name, "Rifter");
    assert.equal(Object.hasOwn(wrapper, "library"), false);
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(start.mock.callCount(), 1);
    assert.equal(shutdown.mock.callCount(), 0);
});

test("ship acquisition rejects null, incompatible graphs and provider/controller failures", async t =>
{
    const library = new CjsLibrary();
    t.after(() => library.Shutdown());
    await library.Initialize({ sof: null, characterLibrary: null });
    let result = null;
    t.mock.method(library, "Fetch", async () => result);
    await assert.rejects(TnyShip.fetch({ dna: "a:b:c" }), /live EveShip2/);
    result = {};
    await assert.rejects(TnyShip.fetch({ dna: "a:b:c" }), /live EveShip2/);
    result = new EveShip2();
    const controllerFailure = new Error("controller failed");
    t.mock.method(result, "StartControllers", () => { throw controllerFailure; });
    await assert.rejects(TnyShip.fetch({ dna: "a:b:c" }), error => error === controllerFailure);
    const loadFailure = new Error("catalog failed");
    t.mock.method(library, "Fetch", async () => { throw loadFailure; });
    await assert.rejects(TnyShip.fetch({ dna: "a:b:c" }), error => error === loadFailure);
    await assert.rejects(TnyShip.fetch({}), /DNA or an object path/);
    await assert.rejects(TnyShip.fetch({ dna: "a:b:c", resPath: "res:/a.black" }), /DNA or an object path/);
    await assert.rejects(TnyShip.fetch({ dna: "a:b:c", typeID: 587 }), /does not take typeID/);
    await library.Shutdown();
    await assert.rejects(TnyShip.fetch({ dna: "a:b:c" }), /initialized CjsLibrary/);
});

test("Fetch waits on resMan's Watch only when awaitResources is set, and forwards the rest", async t =>
{
    const library = new CjsLibrary(), ship = new EveShip2();
    t.after(() => library.Shutdown());
    await library.Initialize({ sof: null, characterLibrary: null });
    const { blue } = await import("../../npm/dist/blue/index.js");
    const fetch = t.mock.method(blue.resMan, "Fetch", async (_path, received) =>
    {
        assert.deepEqual(received, { other: 1 });
        return ship;
    });
    const watch = t.mock.method(blue.resMan, "Watch", async root => ({ object: root, failed: [] }));
    assert.equal(await library.Fetch("res:/ship.black", { other: 1 }), ship);
    assert.equal(watch.mock.callCount(), 0);
    assert.equal(await library.Fetch("res:/ship.black", { other: 1, awaitResources: true }), ship);
    assert.equal(watch.mock.callCount(), 1);
    assert.equal(watch.mock.calls[0].arguments[0], ship);
    assert.equal(fetch.mock.callCount(), 2);
});

test("scene acquisition and adaptation preserve the existing scene and failures", async t =>
{
    const library = new CjsLibrary(), scene = new EveSpaceScene();
    t.after(() => scene.Destruct());
    t.after(() => library.Shutdown());
    await library.Initialize({ sof: null, characterLibrary: null });
    const options = { callerOption: {} };
    t.mock.method(library, "Fetch", async (path, received) =>
    {
        assert.equal(path, "res:/scene.black");
        assert.equal(received, options);
        return scene;
    });
    t.mock.method(scene, "Initialize", () => assert.fail("adaptation never initializes again"));
    const wrapper = await TnyScene.fetch("res:/scene.black", options);
    assert.equal(wrapper.wrapped, scene);
    assert.equal(Object.hasOwn(wrapper, "library"), false);
    assert.equal(TnyScene.fromWrapped(scene).wrapped, scene);
    assert.throws(() => TnyScene.fromWrapped(null), /live EveSpaceScene/);
    assert.throws(() => TnyScene.fromWrapped(new EveShip2()), /live EveSpaceScene/);
    const failure = new Error("scene missing");
    t.mock.method(library, "Fetch", async () => { throw failure; });
    await assert.rejects(TnyScene.fetch("res:/scene.black"), error => error === failure);
});

test("membership uses native notifications and never clears on absent removal", t =>
{
    const nativeScene = new EveSpaceScene();
    t.after(() => nativeScene.Destruct());
    const scene = TnyScene.fromWrapped(nativeScene);
    const first = TnyShip.fromWrapped(new EveShip2());
    const second = TnyShip.fromWrapped(new EveShip2());
    const absent = TnyShip.fromWrapped(new EveShip2());
    const notify = t.mock.method(nativeScene, "OnListModified");
    const start = t.mock.method(first.wrapped, "StartControllers");

    assert.equal(scene.AddObject(first), true);
    assert.equal(scene.AddObject(first), false);
    assert.equal(scene.AddObject(second), true);
    assert.equal(nativeScene.objects.length, 2);
    assert.equal(notify.mock.callCount(), 2);
    assert.equal(start.mock.callCount(), 0, "adding does not restart controllers");
    assert.equal(scene.RemoveObject(absent), false);
    assert.equal(nativeScene.objects.length, 2, "Remove(-1) would incorrectly clear both ships");
    assert.throws(() => scene.AddObject(first.wrapped), /TnySpaceObject/);
    assert.equal(scene.RemoveObject(first), true);
    assert.equal(nativeScene.objects[0], second.wrapped);
    assert.equal(scene.RemoveObject(first), false);
    assert.equal(notify.mock.callCount(), 3);
    assert.equal(scene.RemoveObject(second), true);
});

test("shared library is published only after initialization and cleared on shutdown or failure", async t =>
{
    const library = new CjsLibrary(), other = new CjsLibrary();
    t.after(() => library.Shutdown());
    t.after(() => other.Shutdown());
    assert.equal(CjsLibrary.instance, null);
    await assert.rejects(TnyScene.fetch("res:/scene.black"), /initialized CjsLibrary/);
    const initializing = library.Initialize({ sof: null, characterLibrary: null });
    assert.equal(CjsLibrary.instance, null, "in-flight startup is not published");
    await assert.rejects(other.Initialize(), /already active/);
    await initializing;
    assert.equal(CjsLibrary.instance, library);
    assert.equal(await library.Initialize(), library);
    await library.Shutdown();
    assert.equal(CjsLibrary.instance, null);
    await assert.rejects(other.Initialize({ paths: {} }));
    assert.equal(CjsLibrary.instance, null, "failed startup must release the shared slot");
    await other.Initialize({ sof: null, characterLibrary: null });
    assert.equal(CjsLibrary.instance, other);
});

test("scene post process loads a template by name or path and restores the authored one", async t =>
{
    const library = new CjsLibrary(), nativeScene = new EveSpaceScene();
    t.after(() => nativeScene.Destruct());
    t.after(() => library.Shutdown());
    await library.Initialize({ sof: null, characterLibrary: null });
    const authored = new Tr2PostProcess2(), loaded = new Tr2PostProcess2();
    nativeScene.postprocess = authored;
    const paths = [];
    t.mock.method(library, "Fetch", async path => { paths.push(path); return path.endsWith("bad.black") ? {} : loaded; });
    const scene = TnyScene.fromWrapped(nativeScene);

    assert.equal(await scene.SetPostProcess("env_amarr_01a"), "res:/dx9/postprocess/environmenttemplate/env_amarr_01a.black");
    assert.equal(nativeScene.postprocess, loaded);
    assert.equal(await scene.SetPostProcess("res:/other/post.black"), "res:/other/post.black");
    assert.deepEqual(paths, [ "res:/dx9/postprocess/environmenttemplate/env_amarr_01a.black", "res:/other/post.black" ]);
    await assert.rejects(scene.SetPostProcess("res:/bad.black"), /not a Tr2PostProcess2/);
    assert.equal(nativeScene.postprocess, loaded, "a rejected load leaves the post process");
    assert.equal(await scene.SetPostProcess(null), null);
    assert.equal(nativeScene.postprocess, authored);
    assert.equal(scene.postProcessPath, null);
});

test("scene tracks the wrappers it shows", t =>
{
    const nativeScene = new EveSpaceScene();
    t.after(() => nativeScene.Destruct());
    const scene = TnyScene.fromWrapped(nativeScene);
    const first = TnyShip.fromWrapped(new EveShip2()), second = TnyShip.fromWrapped(new EveShip2());
    scene.AddObject(first);
    scene.AddObject(second);
    scene.AddObject(first);
    assert.deepEqual(scene.GetObjects(), [ first, second ]);
    scene.RemoveObject(first);
    scene.RemoveObject(first);
    assert.deepEqual(scene.GetObjects(), [ second ]);
});

test("scene Fetch wraps each object in its most specific wrapper and adds it", async t =>
{
    const library = new CjsLibrary(), nativeScene = new EveSpaceScene();
    t.after(() => nativeScene.Destruct());
    t.after(() => library.Shutdown());
    await library.Initialize({ sof: null, characterLibrary: null });
    const objects = { ship: new EveShip2(), station: new EveStation2(), mobile: new EveMobile() };
    for (const object of Object.values(objects)) t.mock.method(object, "StartControllers");
    t.mock.method(library, "Fetch", async source => objects[source.split(":")[0]] ?? null);
    const scene = TnyScene.fromWrapped(nativeScene);

    const ship = await scene.Fetch({ dna: "ship:a:b" });
    const station = await scene.Fetch({ dna: "station:a:b", name: "Home" });
    const mobile = await scene.Fetch({ dna: "mobile:a:b" });
    assert.equal(ship.constructor, TnyShip);
    assert.equal(station.constructor, TnyStationary);
    assert.equal(mobile.constructor, TnyMobile);
    assert.equal(objects.station.name, "Home");
    assert.deepEqual(scene.GetObjects(), [ ship, station, mobile ]);
    assert.equal(objects.ship.StartControllers.mock.callCount(), 1);
    await assert.rejects(scene.Fetch({ dna: "none:a:b" }), /live EveSpaceObject2/);
    await assert.rejects(TnyShip.fetch({ dna: "station:a:b" }), /TnyShip requires a live EveShip2/);
});

test("ship values: discovered once, null where unsupported, pushed to native owners and announced", t =>
{
    const native = new EveShip2(), controller = new Tr2Controller();
    const variable = (name, variableType = 2, enumValues = "") =>
    {
        const entry = new Tr2ControllerFloatVariable();
        Object.assign(entry, { name, variableType, enumValues });
        controller.variables.Append(entry);
        return entry;
    };
    const isWarping = variable("IsWarping");
    // A trigger: defaults to 0 and the controller's own state only sets it back to 0.
    variable("StopShipRequested");
    variable("_private");
    const inSiegeMode = variable("InSiegeMode");
    variable("WarpTopSpeed", 0);
    // Named unlike ShipStance: found by what it is, an enum variable driving a machine that plays mesh animations.
    const hullMode = variable("hullMode", 3, "Defence=1, Speed=2, Sniper=3");
    const machine = new Tr2StateMachine(), state = new Tr2StateMachineState(), transition = new Tr2StateMachineTransition();
    transition.condition = "hullMode==2";
    state.transitions.Append(transition);
    state.actions.Append(new Tr2ActionPlayMeshAnimation());
    const reset = new Tr2ActionSetValue();
    Object.assign(reset, { path: "StopShipRequested", attribute: "value", value: "0" });
    state.actions.Append(reset);
    machine.states.Append(state);
    controller.stateMachines.Append(machine);
    native.controllers.Append(controller);

    const ship = TnyShip.fromWrapped(native, { name: "Probe" });
    const values = ship.GetValues();
    assert.equal(values.name, "Probe");
    assert.deepEqual([ values.warp, values.dock, values.siege, values.attack ], [ false, false, false, null ], "each state its own value; no attack flag here");
    assert.equal(values.shield, null, "no impact overlay, no shield, armour or hull");
    assert.equal(values.alwaysOn, null, "no booster set");
    assert.equal(values.displayKillCounterValue, null, "no kill-counter decal");
    assert.equal(values.slots.length, 0, "no weapon locators: the list stays, empty");

    const [ classInfo, interfaces, members ] = ship.GetTypeInfo();
    assert.equal(classInfo.classname, `TnyShip_${ship.id}`);
    assert.deepEqual(Object.keys(interfaces), [ "TnySpaceObject", "TnyMobile", "TnyShip", "stance" ]);
    assert.ok(!("shield" in members) && "age" in members && !("dirtLevel" in members), "age is the value; dirtLevel stays internal");
    assert.deepEqual(members.stance.choosers, [ [ 1, "Defence" ], [ 2, "Speed" ], [ 3, "Sniper" ] ]);
    assert.ok(!("state" in members) && members.warp.type === "boolean" && "siege" in members && !("attack" in members));
    assert.deepEqual(ship.controllers.GetActions().map(action => [ action.name, action.kind ]), [ [ "StopShipRequested", "trigger" ] ]);
    assert.match(ship.GetTypeInfo()[3].Trigger, /StopShipRequested/, "actions are methods, not values");
    assert.ok(!ship.controllers.GetVariableNames().includes("_private"), "a leading _ is private");

    const heard = [], written = {};
    ship._onModified = name => heard.push(name);
    t.mock.method(native, "SetControllerVariable", (name, value) => { written[name] = value; });
    ship.SetValues({ age: 10, siege: true, stance: 2, shield: 0.5 });
    assert.ok(Math.abs(native.dirtLevel - dirtLevelFromWeeks(10)) < 1e-6, "age writes the native dirtLevel");
    // EveSpaceObject2 mirrors dirtLevel into its DirtLevel controller variable when notified.
    assert.deepEqual(written, { DirtLevel: written.DirtLevel, InSiegeMode: 1, hullMode: 2 }, "siege alone; WarpTopSpeed is no state flag");
    assert.equal(ship.shield, null, "a write to an unsupported value is ignored");
    // UpdateValues notifies in member-table order (derived first); the test checks which, not the order.
    assert.deepEqual([ ...heard ].sort(), [ "age", "siege", "stance" ]);

    // The content turns warp on by itself: Sync reads it back and announces it.
    // (SetControllerVariable is mocked above, so the native siege and stance are set by hand to match.)
    inSiegeMode.value = 1;
    hullMode.value = 2;
    isWarping.value = 1;
    ship.Sync();
    assert.equal(ship.warp, true);
    assert.equal(heard.at(-1), "warp");

    ship.Destruct();
    ship.SetValues({ age: 20 });
    assert.equal(heard.includes("age"), true);
    assert.equal(heard.at(-1), "warp", "after Destruct nothing is announced");
});

test("speed is supported only with a Destiny ball, and drives the ball through its park", t =>
{
    const ship = TnyShip.fromWrapped(new EveShip2());
    assert.equal(ship.GetValues().speed, null, "no ball, no speed");
    // A stand-in with the park commands and ball accessors TnyShip uses; the runtime never imports Destiny.
    const commands = [];
    const park = { SetMaxSpeed: (...a) => commands.push([ "SetMaxSpeed", ...a ]), GotoDirection: (...a) => commands.push([ "GotoDirection", ...a ]),
        SetSpeedFraction: (...a) => commands.push([ "SetSpeedFraction", ...a ]) };
    const ball = { mPark: park, mId: 7n, vx: 0, vy: 0, vz: 0, maxVelocity: 300 };
    let typeInfoChanged = 0;
    ship._onTypeInfoModified = () => typeInfoChanged++;
    ship.SetBall(ball);
    assert.equal(ship.wrapped.translationCurve, ball);
    assert.equal(ship.wrapped.rotationCurve, ball);
    assert.equal(typeInfoChanged, 1);
    assert.equal(ship.GetValues().speed, 0);
    assert.equal(ship.wrapped.maxSpeed, 300, "a ship with no max speed takes the ball's");
    commands.length = 0;
    ship.SetValues({ speed: 150 });
    assert.deepEqual(commands.map(command => command[0]), [ "GotoDirection", "SetSpeedFraction" ]);
    assert.deepEqual(commands[0].slice(1), [ 7n, 0, 0, 1 ], "along the ship's heading");
    assert.equal(commands[1][2], 0.5);
    ship.SetBall(null);
    assert.equal(ship.GetValues().speed, null);
    assert.equal(ship.wrapped.translationCurve, null);
});

test("wrapper ids are unique and kept; identity is read-only", () =>
{
    const first = TnyShip.fromWrapped(new EveShip2()), second = TnyShip.fromWrapped(new EveShip2());
    assert.notEqual(first.id, second.id);
    assert.equal(first.identity.SetValues({ hull: "x" }), false);
    assert.equal(first.identity.hull, null);
});

test("scene ballpark is a declared value pushed to EveSpaceScene.ballpark, null when unset", () =>
{
    const native = new EveSpaceScene();
    const scene = TnyScene.fromWrapped(native);
    assert.equal(scene.GetValues().ballpark, null, "unset");
    assert.ok("ballpark" in scene.GetTypeInfo()[2]);
    const sharpening = scene.GetTypeInfo()[2].sharpeningStrength;
    assert.equal(scene.GetValues().sharpeningStrength, null, "no post process (or no compute): no sharpening");
    assert.equal(sharpening.available, false);
    assert.ok(sharpening.reason, "an unavailable value says why");
    const heard = [];
    scene._onModified = name => heard.push(name);
    // A stand-in for the host's Destiny park: the scene calls GetReferencePoint only. A
    // class instance, as a park is: the graph keeps it as a reference (a plain bag would be read as data).
    const park = new class { GetReferencePoint(_time, out) { return out; } }();
    scene.SetValues({ ballpark: park });
    assert.equal(native.ballpark, park);
    assert.equal(scene.GetValues().ballpark, park, "the host's park comes back as itself, not as values");
    assert.deepEqual(heard, [ "ballpark" ]);
    scene.SetValues({ ballpark: null });
    assert.equal(native.ballpark, null);
});
