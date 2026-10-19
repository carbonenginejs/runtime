import assert from "node:assert/strict";
import test from "node:test";
import { TnyInputMan } from "../../npm/dist/input/index.js";
import { TnyTransformGizmo } from "../../npm/dist/core/gizmos/TnyTransformGizmo.js";
import { TnyCameraControls } from "../../npm/dist/core/cameras/TnyCameraControls.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveCamera, Tr2Effect, TriDevice, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

function deferred()
{
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function pointer(type, extra = {})
{
  return { type, pointerId: 1, button: 0, x: 100, y: 100, dx: 0, dy: 0, ...extra };
}

test("a pending handle pick serializes moves and exclusively owns the drag", async () =>
{
  const input = new TnyInputMan(), pick = deferred(), seen = [], camera = [];
  input.Register({ priority: 100, cancel() {}, async handle(event)
  {
    seen.push(event);
    if (event.type === "pointerdown") { await pick.promise; return TnyInputMan.Result.CAPTURE; }
    return event.type === "pointerup" ? TnyInputMan.Result.RELEASE : TnyInputMan.Result.CONSUME;
  } });
  input.Register({ cancel() {}, handle(event) { camera.push(event); return TnyInputMan.Result.CAPTURE; } });
  input.Enqueue(pointer("pointerdown"));
  const update = input.Update();
  input.Enqueue(pointer("pointermove", { dx: 2, x: 102 }));
  input.Enqueue(pointer("pointermove", { dx: 3, x: 105 }));
  input.Enqueue(pointer("pointerup", { x: 105 }));
  assert.equal(seen.length, 1);
  pick.resolve();
  await update;
  assert.deepEqual(seen.map(event => event.type), ["pointerdown", "pointermove", "pointerup"]);
  assert.equal(seen[1].dx, 5);
  assert.equal(seen[1].x, 105);
  assert.equal(camera.length, 0);
  assert.equal(input._owner, null);
  input.Destruct();
});

test("cancellation during an awaited pick cannot claim capture or replay queued input", async () =>
{
  const input = new TnyInputMan(), pick = deferred(), seen = [], cancelled = [];
  input.Register({ cancel: reason => cancelled.push(reason), async handle(event)
  {
    seen.push(event.type);
    await pick.promise;
    return TnyInputMan.Result.CAPTURE;
  } });
  input.Enqueue(pointer("pointerdown"));
  const update = input.Update();
  input.Enqueue(pointer("pointermove", { dx: 9 }));
  input.Cancel("focus-lost");
  pick.resolve();
  await update;
  assert.deepEqual(seen, ["pointerdown"]);
  assert.deepEqual(cancelled, ["focus-lost"]);
  assert.equal(input._owner, null);
  input.Destruct();
});

test("a missed handle passes the same drag to the Carbon camera consumer", async t =>
{
  const input = new TnyInputMan(), calls = [];
  const camera = new EveCamera();
  t.mock.method(camera, "OrbitParent", (...args) => calls.push(["orbit", ...args]));
  const controls = new TnyCameraControls({ camera }).Install(input);
  input.Register({ priority: 100, cancel() {}, async handle() { return TnyInputMan.Result.PASS; } });
  input.Enqueue(pointer("pointerdown"));
  input.Enqueue(pointer("pointermove", { dx: 10, dy: -5 }));
  input.Enqueue(pointer("pointerup"));
  await input.Update();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "orbit");
  assert.ok(calls[0].slice(1).every(Number.isFinite));
  assert.equal(input._owner, null);
  controls.Destruct();
  input.Destruct();
});

test("with the real camera and gizmo composed, a drag on an object orbits and a click selects it", async t =>
{
  const input = new TnyInputMan(), orbits = [], selected = [];
  const camera = new EveCamera();
  t.mock.method(camera, "OrbitParent", (...args) => orbits.push(args));
  const controls = new TnyCameraControls({ camera }).Install(input);
  const gizmo = setupGizmo(t, "off");
  gizmo.pickObject = async () => ({ name: "ship" });
  gizmo.onSelect = object => selected.push(object);
  gizmo.Install(input);

  // A drag that starts on the object: the camera captures once it moves past the slop.
  input.Enqueue(pointer("pointerdown"));
  input.Enqueue(pointer("pointermove", { dx: 3, dy: 0 }));
  input.Enqueue(pointer("pointermove", { dx: 10, dy: -5 }));
  input.Enqueue(pointer("pointerup"));
  await input.Update();
  assert.equal(orbits.length, 1, "orbited once the drag passed the slop");
  assert.equal(selected.length, 0, "a drag does not select");
  assert.equal(input._owner, null);

  // A click: no capture, so the release reaches the gizmo, which selects.
  input.Enqueue(pointer("pointerdown"));
  input.Enqueue(pointer("pointerup"));
  await input.Update();
  assert.equal(selected.length, 1, "a click selects");
  assert.equal(orbits.length, 1, "a click does not orbit");

  gizmo.Uninstall();
  controls.Destruct();
  input.Destruct();
});

for (const mode of ["translation", "rotation", "scaling"])
{
  test(`${mode} leaves Shift-left and middle drags to camera pan even over a handle`, async t =>
  {
    const gizmo = setupGizmo(t, mode), input = new TnyInputMan(), camera = new EveCamera();
    const controls = new TnyCameraControls({ camera }).Install(input), pans = [];
    t.mock.method(controls, "Pan", (...delta) => pans.push(delta));
    const local = mat4.create();
    gizmo.SetTarget({ readLocal: out => mat4.copy(out, local), writeLocal: () => assert.fail("pan must not transform"),
      readParentWorld: out => mat4.identity(out) }).Install(input);
    const pick = t.mock.method(gizmo.scene, "PickObject", async () => gizmo.tool.primitives.find(item => item.name === "x"));
    gizmo.pickObject = () => assert.fail("pan must not select");
    for (const modifiers of [{ shift: true }, { button: 1 }])
    {
      input.Enqueue(pointer("pointerdown", modifiers));
      input.Enqueue(pointer("pointermove", { ...modifiers, dx: 12, dy: 8, buttons: modifiers.button === 1 ? 4 : 1 }));
      input.Enqueue(pointer("pointerup", modifiers));
      await input.Update();
      assert.equal(input._owner, null);
      assert.equal(gizmo._drag, null);
      assert.equal(gizmo._press, null);
    }
    assert.deepEqual(pans, [[12, 8], [12, 8]]);
    assert.equal(pick.mock.callCount(), 0, "camera pan must not wait for GPU picking");
    controls.Destruct(); gizmo.Uninstall(); input.Destruct();
  });
}

for (const axis of ["x", "y", "z"])
{
  test(`scale guide _${axis} selects the working ${axis} axis`, async t =>
  {
    const gizmo = setupGizmo(t, "scaling"), local = mat4.create();
    gizmo.SetTarget({ readLocal: out => mat4.copy(out, local), writeLocal: value => mat4.copy(local, value),
      readParentWorld: out => mat4.identity(out) });
    t.mock.method(gizmo.scene, "PickObject", async () => gizmo.tool.primitives.find(item => item.name === `_${axis}`));
    assert.equal(await gizmo.HandleInput(pointer("pointerdown")), TnyInputMan.Result.CAPTURE);
    assert.equal(gizmo.tool.selectedAxis, axis);
    assert.equal(await gizmo.HandleInput(pointer("pointerup")), TnyInputMan.Result.RELEASE);
  });
}

function setupGizmo(t, mode)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previous = context.GetRenderContextAL();
  const before = new Set(TriDevice.GetResourcesRegistered()), al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  // This suite exercises native geometry and transforms, not effect fetching.
  t.mock.method(Tr2Effect.prototype, "SetEffectPathName", function(path) { this.effectFilePath = path; });
  const gizmo = new TnyTransformGizmo({ mode, getView: () => ({ context }) });
  t.after(() =>
  {
    gizmo.Destruct();
    for (const resource of TriDevice.GetResourcesRegistered()) if (!before.has(resource)) resource.Destruct();
    context.SetRenderContextAL(previous);
  });
  return gizmo;
}

function close(actual, expected)
{
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-4, `matrix element ${i}: ${actual[i]} != ${expected[i]}`);
}

test("gizmo Q/W/E/R defaults rebind atomically and ignore modified chords and repeats", async t =>
{
  const gizmo = setupGizmo(t, "scaling"), input = new TnyInputMan();
  gizmo.Install(input);
  const press = async (code, extra = {}) =>
  {
    input.Enqueue({ type: "keydown", code, ...extra });
    await input.Update();
  };
  await press("KeyW");
  assert.equal(gizmo.mode, "translation");
  await press("KeyE");
  assert.equal(gizmo.mode, "rotation");
  const tool = gizmo.tool;
  await press("KeyE", { repeat: true });
  assert.equal(gizmo.tool, tool);
  for (const modifier of ["shift", "ctrl", "alt", "meta", "isComposing"])
    await press("KeyR", { [modifier]: true });
  assert.equal(gizmo.mode, "rotation");
  await press("KeyR");
  assert.equal(gizmo.mode, "scaling");
  await press("KeyQ");
  assert.equal(gizmo.mode, "off");
  assert.equal(gizmo.tool, null);
  assert.equal(gizmo.GetKeyBindings().off, "KeyQ");
  gizmo.SetKeyBindings({ off: "KeyX" });
  await press("KeyW");
  await press("KeyQ");
  assert.equal(gizmo.mode, "translation");
  await press("KeyX");
  assert.equal(gizmo.mode, "off");
  await press("KeyR");
  gizmo.SetKeyBindings({ translation: "KeyG", rotation: "KeyR", scaling: "KeyS" });
  assert.throws(() => gizmo.SetKeyBindings({ translation: "KeyE" }), /distinct/);
  assert.equal(gizmo.GetKeyBindings().translation, "KeyG");
  await press("KeyW");
  assert.equal(gizmo.mode, "scaling");
  await press("KeyG");
  assert.equal(gizmo.mode, "translation");
  gizmo.SetKeyBindings({ rotation: null });
  await press("KeyE");
  assert.equal(gizmo.mode, "translation");
  gizmo.SetKeyBindings();
  await press("KeyE");
  assert.equal(gizmo.mode, "rotation");
  gizmo.Uninstall();
  input.Destruct();
});

test("off destroys handles, rolls back a drag and keeps object selection active", async t =>
{
  const gizmo = setupGizmo(t, "translation"), input = new TnyInputMan();
  const local = mat4.create(), initial = mat4.clone(local), selected = {};
  const target = { readLocal: out => mat4.copy(out, local), writeLocal: value => mat4.copy(local, value),
    readParentWorld: out => mat4.identity(out) };
  gizmo.SetTarget(target).Install(input);
  t.mock.method(gizmo.scene, "PickObject", async () => gizmo.tool.primitives[0]);
  const tool = gizmo.tool, destroy = t.mock.method(tool, "Destruct");
  input.Enqueue(pointer("pointerdown"));
  await input.Update();
  local[12] = 400;
  input.Enqueue({ type: "keydown", code: "KeyQ" });
  await input.Update();
  assert.deepEqual(local, initial);
  assert.equal(destroy.mock.callCount(), 1);
  assert.equal(gizmo.scene.manipulator, null);
  assert.equal(gizmo.tool, null);
  assert.equal(input._owner, null);
  t.mock.method(gizmo.scene, "PickObject", () => assert.fail("off must not pick handles"));
  gizmo.pickObject = async () => selected;
  let selections = 0;
  gizmo.onSelect = object => { assert.equal(object, selected); selections++; gizmo.SetTarget(target); };
  // A click selects on release, and both halves still reach the camera.
  assert.equal(await gizmo.HandleInput(pointer("pointerdown")), TnyInputMan.Result.PASS);
  assert.equal(selections, 0, "nothing is selected on the press");
  assert.equal(await gizmo.HandleInput(pointer("pointerup")), TnyInputMan.Result.PASS);
  assert.equal(selections, 1, "the click selected on release");
  assert.equal(gizmo.scene.manipulator, null);
  gizmo.Sync();
  gizmo.SetMode("rotation");
  assert.equal(gizmo.scene.manipulator, gizmo.tool);
  gizmo.SetMode("off");
  gizmo.Uninstall();
  input.Destruct();
});

test("a drag that starts on an object orbits instead of selecting it", async t =>
{
  const gizmo = setupGizmo(t, "off");
  let selections = 0;
  gizmo.pickObject = async () => ({});
  gizmo.onSelect = () => selections++;
  assert.equal(await gizmo.HandleInput(pointer("pointerdown")), TnyInputMan.Result.PASS);
  assert.equal(await gizmo.HandleInput(pointer("pointermove", { dx: 6, dy: 2 })), TnyInputMan.Result.PASS);
  assert.equal(await gizmo.HandleInput(pointer("pointerup")), TnyInputMan.Result.PASS);
  assert.equal(selections, 0, "moved further than CLICK_SLOP: a drag, not a click");

  // Within the slop it is still a click.
  await gizmo.HandleInput(pointer("pointerdown"));
  await gizmo.HandleInput(pointer("pointermove", { dx: 2, dy: 1 }));
  await gizmo.HandleInput(pointer("pointerup"));
  assert.equal(selections, 1);
});

test("switching off invalidates an outstanding handle pick", async t =>
{
  const gizmo = setupGizmo(t, "translation"), pick = deferred(), local = mat4.create();
  gizmo.SetTarget({ readLocal: out => mat4.copy(out, local), writeLocal: value => mat4.copy(local, value),
    readParentWorld: out => mat4.identity(out) });
  const handle = gizmo.tool.primitives[0];
  t.mock.method(gizmo.scene, "PickObject", () => pick.promise);
  const pending = gizmo.HandleInput(pointer("pointerdown"));
  gizmo.SetMode("off");
  pick.resolve(handle);
  assert.equal(await pending, TnyInputMan.Result.CONSUME);
  assert.equal(gizmo._drag, null);
  assert.equal(gizmo.scene.manipulator, null);
});

function host()
{
  const listeners = new Map(), captures = new Set();
  return {
    width: 800, height: 600, tagName: "CANVAS", hidden: false,
    addEventListener(type, callback) { const list = listeners.get(type) || []; list.push(callback); listeners.set(type, list); },
    removeEventListener(type, callback) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== callback)); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }),
    contains: () => false,
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id),
    releasePointerCapture: id => captures.delete(id),
    emit(type, values = {})
    {
      const event = { target: this, code: "", key: "", button: 0, pointerId: 1, clientX: 0, clientY: 0,
        defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
      for (const callback of listeners.get(type) || []) callback(event);
      return event;
    }
  };
}

test("focused host routes pan, normalized wheel, FOV and gizmo defaults without stealing browser keys", async t =>
{
  const gizmo = setupGizmo(t, "scaling"), window = host(), document = host(), canvas = host();
  canvas.focus = () => { document.activeElement = canvas; };
  document.activeElement = canvas;
  const input = new TnyInputMan().Attach({ target: canvas, window, document });
  const camera = new EveCamera();
  camera.fieldOfView = Math.PI / 4;
  camera.backClip = 10000;
  const controls = new TnyCameraControls({ camera, getViewport: () => ({ width: 800, height: 600 }),
    getBounds: () => ({ centre: [10, 20, 30], radius: 50 }) }).Install(input);
  controls.Frame();
  camera.Update(0, 4 / 3);
  gizmo.Install(input);
  t.after(() => { gizmo.Uninstall(); controls.Destruct(); input.Destruct(); });
  assert.equal(window.emit("keydown", { code: "KeyW" }).defaultPrevented, true);
  assert.equal(gizmo.mode, "scaling", "browser dispatch only queues the mode switch");
  await input.Update(1 / 60);
  assert.equal(gizmo.mode, "translation");
  for (const modifier of ["ctrlKey", "metaKey", "altKey"])
    assert.equal(window.emit("keydown", { code: "KeyR", [modifier]: true }).defaultPrevented, false);
  await input.Update(1 / 60);
  assert.equal(gizmo.mode, "translation");
  const centre = [...camera.extraTranslation];
  canvas.emit("pointerdown", { button: 1 });
  canvas.emit("pointermove", { clientX: 20, clientY: 10 });
  canvas.emit("pointerup", { button: 1, clientX: 20, clientY: 10 });
  await input.Update(1 / 60);
  assert.notDeepEqual([...camera.extraTranslation], centre);
  const fov = camera.fieldOfView;
  canvas.emit("wheel", { deltaY: 2, deltaMode: 1, shiftKey: true });
  await input.Update(1 / 60);
  assert.ok(Math.abs(camera.fieldOfView - fov - 0.032) < 1e-6);
  camera.Update(1, 4 / 3);
  assert.ok(Math.abs(camera.fieldOfView - fov - 0.032) < 1e-6, "native zoom curve must not overwrite manual FOV");
  assert.equal(window.emit("keydown", { code: "Home" }).defaultPrevented, true);
  await input.Update();
  assert.deepEqual([...camera.extraTranslation], [10, 20, 30]);
  document.activeElement = { tagName: "INPUT" };
  canvas.emit("blur");
  assert.equal(window.emit("keydown", { code: "KeyE" }).defaultPrevented, false);
  assert.equal(canvas.emit("wheel", { deltaY: 30 }).defaultPrevented, false);
  await input.Update(1 / 60);
  assert.equal(gizmo.mode, "translation");
});

test("camera key-up reaches its consumer during another consumer's pointer capture", async t =>
{
  const input = new TnyInputMan(), camera = new EveCamera(), moves = [];
  t.mock.method(camera, "OrbitParent", (...args) => moves.push(args));
  const controls = new TnyCameraControls({ camera }).Install(input);
  input.Register({ priority: 100, cancel() {}, handle: event => event.type === "pointerdown"
    ? TnyInputMan.Result.CAPTURE : event.type === "pointerup" ? TnyInputMan.Result.RELEASE : TnyInputMan.Result.PASS });
  input.Enqueue({ type: "keydown", code: "ArrowLeft" });
  await input.Update(0.02);
  assert.equal(moves.length, 1);
  input.Enqueue(pointer("pointerdown"));
  input.Enqueue({ type: "keyup", code: "ArrowLeft", shift: true });
  await input.Update(0.02);
  input.Enqueue(pointer("pointerup"));
  await input.Update(0.02);
  assert.equal(moves.length, 1, "released keys must not resume after pointer capture ends");
  controls.Destruct();
  input.Destruct();
});

for (const mode of ["translation", "rotation", "scaling"])
{
  test(`${mode} preserves full affine targets under rotated, nonuniform parents and cancels exactly`, async t =>
  {
    const gizmo = setupGizmo(t, mode);
    const parent = mat4.fromZRotation(mat4.create(), 0.71);
    mat4.scale(parent, parent, [2, 3, 0.7]);
    parent[12] = 12;
    parent[13] = -6;
    const local = mat4.fromYRotation(mat4.create(), -0.36);
    local[4] += 0.4;
    local[8] += 0.2;
    local[12] = 4;
    local[14] = 8;
    const initial = mat4.clone(local), initialWorld = mat4.multiply(mat4.create(), parent, local);
    gizmo.SetTarget({ readLocal: out => mat4.copy(out, local), readParentWorld: out => mat4.copy(out, parent), writeLocal: value => mat4.copy(local, value) });
    close(local, initial);
    t.mock.method(gizmo.scene, "PickObject", async () => gizmo.tool.primitives[0]);
    assert.equal(await gizmo.HandleInput(pointer("pointerdown")), TnyInputMan.Result.CAPTURE);
    const current = mode === "scaling" ? mat4.create() : mat4.clone(gizmo.tool.localTransform);
    const delta = mode === "translation" ? mat4.fromTranslation(mat4.create(), [7, -2, 5])
      : mode === "rotation" ? mat4.fromZRotation(mat4.create(), 0.43)
      : mat4.fromScaling(mat4.create(), [1.5, 0.8, 1.2]);
    const next = mat4.multiply(mat4.create(), delta, current);
    const worldDelta = mat4.clone(delta);
    if (mode === "scaling")
    {
      mat4.multiply(worldDelta, gizmo._frame, delta);
      mat4.multiply(worldDelta, worldDelta, mat4.invert(mat4.create(), gizmo._frame));
    }
    assert.equal(gizmo.tool.OnMoveCallback(current, next), true);
    close(mat4.multiply(mat4.create(), parent, local), mat4.multiply(mat4.create(), worldDelta, initialWorld));
    gizmo.Cancel();
    assert.deepEqual([...local], [...initial]);
    assert.equal(gizmo.tool.captured, false);
  });
}

test("a cancelled gizmo pick cannot attach to a replacement target", async t =>
{
  const gizmo = setupGizmo(t, "translation"), pick = deferred(), local = mat4.create();
  const target = { readLocal: out => mat4.copy(out, local), readParentWorld: out => mat4.identity(out), writeLocal: value => mat4.copy(local, value) };
  gizmo.SetTarget(target);
  t.mock.method(gizmo.scene, "PickObject", () => pick.promise);
  const pending = gizmo.HandleInput(pointer("pointerdown"));
  gizmo.SetTarget(null);
  pick.resolve(gizmo.tool.primitives[0]);
  assert.equal(await pending, TnyInputMan.Result.CONSUME);
  assert.equal(gizmo._drag, null);
  assert.equal(gizmo.tool.captured, false);
});


for (const mode of ["off", "translation"])
{
  test(`empty-space clicks clear selection in ${mode} mode; camera drags retain it`, async t =>
  {
    const gizmo = setupGizmo(t, mode), local = mat4.create();
    const target = { readLocal: out => mat4.copy(out, local), writeLocal: value => mat4.copy(local, value),
      readParentWorld: out => mat4.identity(out) };
    gizmo.SetTarget(target);
    t.mock.method(gizmo.scene, "PickObject", async () => null);
    gizmo.pickObject = async () => null;
    const selections = [];
    gizmo.onSelect = object => { selections.push(object); gizmo.SetTarget(object); };
    await gizmo.HandleInput(pointer("pointerdown"));
    await gizmo.HandleInput(pointer("pointermove", { dx: 20, x: 120 }));
    await gizmo.HandleInput(pointer("pointerup", { x: 120 }));
    assert.equal(gizmo.target, target, "orbiting over empty space keeps the target");
    assert.deepEqual(selections, []);
    await gizmo.HandleInput(pointer("pointerdown"));
    assert.equal(gizmo.target, target, "selection waits for click release");
    await gizmo.HandleInput(pointer("pointerup"));
    assert.deepEqual(selections, [null]);
    assert.equal(gizmo.target, null);
    assert.equal(gizmo.scene.manipulator, null);
  });
}

test("a stale empty-space readback cannot clear a newer selection", async t =>
{
  const gizmo = setupGizmo(t, "off"), pick = deferred();
  gizmo.pickObject = () => pick.promise;
  gizmo.onSelect = () => assert.fail("cancelled selection must not be published");
  await gizmo.HandleInput(pointer("pointerdown"));
  const pending = gizmo.HandleInput(pointer("pointerup"));
  const target = { readLocal: out => mat4.identity(out), writeLocal() {}, readParentWorld: out => mat4.identity(out) };
  gizmo.SetTarget(target);
  pick.resolve(null);
  await pending;
  assert.equal(gizmo.target, target);
});

test("zooming out is not capped by the far clip: a huge selection can be left, and the far clip follows", () =>
{
  const camera = new EveCamera();
  camera.frontClip = 5; camera.backClip = 10000; camera.translationFromParent = 2e5;
  // A selected planet: its 1% zoom floor (189 km) is past the far clip (10 km).
  const controls = new TnyCameraControls({ camera, getBounds: () => ({ centre: [ 0, 0, 0 ], radius: 1.889e7 }) });
  controls.Dolly(1000);
  assert.ok(camera.translationFromParent > 2e5 * 3, "the wheel moves the camera out");
  assert.ok(camera.backClip >= (camera.translationFromParent + 1.889e7) * 1.05 - 1, "the far clip covers the bounds from the new distance");
  for (let step = 0; step < 200; step++) controls.Dolly(20000);
  assert.equal(camera.translationFromParent, controls.preferences.maxDistance);
  controls.Destruct();
});

test("D flies to the framing pose, eased, landing where F frames; framing leaves the near clip alone", () =>
{
  const camera = new EveCamera();
  camera.frontClip = 5; camera.backClip = 10000; camera.translationFromParent = 100;
  let bounds = { centre: [ 0, 0, 0 ], radius: 50 };
  const controls = new TnyCameraControls({ camera, getViewport: () => ({ width: 800, height: 600 }), getBounds: () => bounds });
  camera.Update(0, 4 / 3);
  bounds = { centre: [ 5e6, 0, 0 ], radius: 1e6 };
  assert.equal(controls.Fly(), true);
  controls.Update(0.05);
  const early = camera.translationFromParent;
  assert.ok(early > 100 && early < 1e5, "a flight starts slowly");
  for (let step = 0; step < 100; step++)
  {
    camera.Update(0, 4 / 3);
    const range = Math.hypot(...[ 0, 1, 2 ].map(axis => camera.pos[axis] - bounds.centre[axis]));
    assert.ok(range > bounds.radius, `the eye stays outside the target (step ${step})`);
    assert.ok(range + bounds.radius <= camera.backClip, `the far clip covers the target (step ${step})`);
    controls.Update(0.05);
  }
  const flown = { distance: camera.translationFromParent, centre: Array.from(camera.extraTranslation), front: camera.frontClip };
  controls.Frame();
  assert.ok(Math.abs(flown.distance - camera.translationFromParent) < 1e-6 * camera.translationFromParent, "lands where Frame frames");
  assert.deepEqual(flown.centre, Array.from(camera.extraTranslation));
  assert.equal(camera.frontClip, 5, "the near clip stays inside the first shadow split");
  assert.equal(flown.front, 5);
  // Any orbit stops a flight where it is.
  bounds = { centre: [ 5e6, 0, 0 ], radius: 1e6 };
  controls.Fly(); controls.Update(0.05); controls.Orbit(1, 0);
  const stopped = camera.translationFromParent; controls.Update(0.05);
  assert.equal(camera.translationFromParent, stopped);
  controls.Destruct();
});
