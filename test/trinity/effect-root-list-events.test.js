import test from "node:test";
import assert from "node:assert/strict";
import { EveEffectRoot2 } from "../../npm/dist/trinity/index.js";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../npm/dist/trinity/controllers/contracts.js";

/**
 * EveEffectRoot2.OnListModified (Carbon cpp:88-193): controller link/unlink
 * with variable replay, child ownership + registry edges, and the light
 * list's size-edge LightOwner component registration.
 */

function makeController()
{
  const calls = [];
  return {
    calls,
    Link(owner) { calls.push([ "Link", owner ]); },
    Unlink() { calls.push([ "Unlink" ]); },
    SetVariable(name, value) { calls.push([ "SetVariable", name, value ]); }
  };
}

function makeChild()
{
  const calls = [];
  return {
    calls,
    SetOwner(owner) { calls.push([ "SetOwner", owner ]); },
    SetControllerVariable(name, value) { calls.push([ "SetControllerVariable", name, value ]); },
    StartControllers() { calls.push([ "StartControllers" ]); },
    Register(registry) { calls.push([ "Register", registry ]); },
    UnRegister(registry) { calls.push([ "UnRegister", registry ]); }
  };
}

test("controller inserts link and replay recorded variables; removals unlink", () =>
{
  const root = new EveEffectRoot2();
  root.SetControllerVariable("Speed", 0.5);

  const controller = makeController();
  root.controllers.push(controller);
  root.OnListModified(BELIST_INSERTED, 0, 0, controller, root.controllers);
  assert.deepEqual(controller.calls, [ [ "Link", root ], [ "SetVariable", "Speed", 0.5 ] ]);

  controller.calls.length = 0;
  root.OnListModified(BELIST_REMOVED, 0, 0, controller, root.controllers);
  assert.deepEqual(controller.calls, [ [ "Unlink" ] ]);

  // Loading-phase events are suppressed exactly as Carbon's BELIST_LOADING
  // gate suppresses them.
  controller.calls.length = 0;
  root.OnListModified(BELIST_INSERTED | BELIST_LOADING, 0, 0, controller, root.controllers);
  assert.deepEqual(controller.calls, []);

  // Unload-start unlinks every controller still in the list.
  const second = makeController();
  root.controllers.push(second);
  root.OnListModified(BELIST_UNLOADSTART, 0, 0, null, root.controllers);
  assert.deepEqual(controller.calls, [ [ "Unlink" ] ]);
  assert.deepEqual(second.calls, [ [ "Unlink" ] ]);
});

test("child inserts take ownership, replay variables and start controllers", () =>
{
  const root = new EveEffectRoot2();
  root.SetControllerVariable("Heat", 2);

  const child = makeChild();
  root.effectChildren.push(child);
  root.OnListModified(BELIST_INSERTED, 0, 0, child, root.effectChildren);
  assert.deepEqual(child.calls, [
    [ "SetOwner", root ],
    [ "SetControllerVariable", "Heat", 2 ],
    [ "StartControllers" ]
  ]);

  child.calls.length = 0;
  root.OnListModified(BELIST_REMOVED, 0, 0, child, root.effectChildren);
  assert.deepEqual(child.calls, [ [ "SetOwner", null ] ]);
});

test("registry edges: children register when the root is registered; lights toggle LightOwner", () =>
{
  const registryCalls = [];
  const registry = {
    Register(entity) { entity.registry = registry; },
    UnRegister(entity) { entity.registry = null; },
    RegisterComponent(type, owner) { registryCalls.push([ "RegisterComponent", type, owner ]); },
    UnRegisterComponent(type, owner) { registryCalls.push([ "UnRegisterComponent", type, owner ]); }
  };
  const root = new EveEffectRoot2();
  // EveEntity's registry seam: the registry stores itself on the entity.
  root.Register(registry);

  const child = makeChild();
  root.effectChildren.push(child);
  root.OnListModified(BELIST_INSERTED, 0, 0, child, root.effectChildren);
  assert.deepEqual(child.calls.at(-1), [ "Register", registry ]);

  child.calls.length = 0;
  root.OnListModified(BELIST_UNLOADSTART, 0, 0, null, root.effectChildren);
  assert.deepEqual(child.calls, [ [ "UnRegister", registry ], [ "SetOwner", null ] ]);

  // Lights: FIRST insert registers the LightOwner component, LAST removal
  // (list already empty) unregisters it - Carbon's size-edge rule.
  registryCalls.length = 0;
  root.lights.push({});
  root.OnListModified(BELIST_INSERTED, 0, 0, root.lights[0], root.lights);
  assert.equal(registryCalls.length, 1);
  assert.equal(registryCalls[0][0], "RegisterComponent");

  const light = root.lights.pop();
  root.OnListModified(BELIST_REMOVED, 0, 0, light, root.lights);
  assert.equal(registryCalls.at(-1)[0], "UnRegisterComponent");

  // A removal that leaves lights in the list does NOT unregister.
  registryCalls.length = 0;
  root.lights.push({}, {});
  const dropped = root.lights.pop();
  root.OnListModified(BELIST_REMOVED, 0, 0, dropped, root.lights);
  assert.equal(registryCalls.length, 0);
});
