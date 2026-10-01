import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { DictReader, DictWriter, Copier, BlueList, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";
import { Tr2ActionPlayMeshAnimation } from "../../npm/dist/trinity/controllers/action/Tr2ActionPlayMeshAnimation.js";
import { Tr2ActionSpawnParticles } from "../../npm/dist/trinity/controllers/action/Tr2ActionSpawnParticles.js";
import { Tr2ActionOverlay } from "../../npm/dist/trinity/controllers/action/Tr2ActionOverlay.js";

for (const [Type, values, extra] of [
  [Tr2ActionPlayMeshAnimation, { animation: "warp", mask: "body", loops: 2, speed: 2, destination: null }, [INotify]],
  [Tr2ActionSpawnParticles, { emitter: null, rate: 4 }, []],
  [Tr2ActionOverlay, { path: "res:/overlay.red", overlayName: "halo", addOnStart: false }, []]
])
{
  test(`${Type.name} uses Blue construction and copy without model state`, () =>
  {
    const instance = new Type();
    assert.equal(Object.getPrototypeOf(Type.prototype), ITr2ControllerAction.prototype);
    assert.equal(CjsSchema.cast(instance, CjsModel), null);
    assert.deepEqual([...mappedInterfaces(Type)], [Type, ITr2ControllerAction, ...extra]);
    assert.equal(Type.from, undefined);
    for (const key of ["SetValues", "GetValues", "UpdateValues", "Initialize", "Dispose"])
      assert.equal(instance[key], undefined);
    const created = new DictReader({ declarations: true }).CreateObject({ _type: Type.name, ...values });
    const clone = new Copier().CloneTo(created);
    assert.ok(clone instanceof Type);
    const written = new DictWriter().WriteObject(clone, {}, { persistOnly: true });
    for (const [key, value] of Object.entries(values)) assert.equal(written[key], value);
    for (const key of ["_controller", "_resolvedDestination", "_overlay", "isBindingValid"])
      assert.equal(Object.hasOwn(written, key), false);
    const list = new BlueList(ITr2ControllerAction, { className: null, listOps: 0 });
    assert.equal(list.Append(clone), true);
    assert.equal(list.GetAt(0), clone);
    assert.equal(clone.CanTransition(), true);
  });
}

test("Mesh native declarations retain stored order and cached live validity", () =>
{
  const Type = Tr2ActionPlayMeshAnimation, action = new Type();
  assert.deepEqual(CjsSchema.getSchema(Type).members.map(field => field.name),
    ["animation", "mask", "playAction", "stopAction", "loops", "delay", "speed", "destinationType", "path", "destination", "delayBinding"]);
  assert.equal(action.isBindingValid, true);
  action.destinationType = Type.DestinationType.CHILD;
  // The direct target remains unresolved until Link or the retained lazy method.
  const target = {};
  action.destination = target;
  assert.equal(action.isBindingValid, false);
  action.Link({});
  assert.equal(action.isBindingValid, true);
  assert.equal(action.GetDestination(), target);
  action.Unlink();
  assert.equal(action.isBindingValid, false);
  assert.equal(action.IsBindingValid(), true);
});

test("Mesh delayed binding and required root/layer calls retain explicit boundaries", () =>
{
  const Type = Tr2ActionPlayMeshAnimation, action = new Type();
  action.destinationType = Type.DestinationType.CHILD;
  action.path = "child";
  action.delayBinding = true;
  action.Link({});
  assert.equal(action.isBindingValid, false);
  assert.throws(() => action.GetDestination(), TypeError);
  action.Unlink();
  action.destinationType = Type.DestinationType.OWNER;
  action.animation = "warp";
  const controller = { GetOwner: () => ({ GetAnimationController: () => ({ GetAnimationLayer: () => ({}) }) }) };
  action.stopAction = Type.StopAction.STOP;
  assert.throws(() => action.Stop(controller), TypeError);
  action.stopAction = Type.StopAction.ENQUEUE_STOP;
  assert.throws(() => action.Stop(controller), TypeError);
});

test("Spawn delegates fresh native temporary arguments without particle simulation", () =>
{
  const action = new Tr2ActionSpawnParticles(), calls = [];
  assert.equal(action.rate, 1);
  assert.doesNotThrow(() => action.Start());
  action.emitter = { SpawnParticles: (...args) => calls.push(args) };
  action.rate = 3;
  action.Start();
  action.Start();
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0][0], calls[1][0]);
  for (const args of calls)
  {
    assert.equal(args[0].emitCountFactor, 1);
    assert.deepEqual(args.slice(1), [null, null, 3]);
  }
  action.emitter = {};
  assert.throws(() => action.Start(), TypeError);
});

test("Overlay preserves cached reuse and releases its reference without loading resources", () =>
{
  const action = new Tr2ActionOverlay(), events = [];
  const overlay = { name: "halo", StartControllers: () => events.push("start") };
  const owner = { overlays: [overlay], LoadOverlayEffect: () => { throw new Error("must not load"); } };
  const controller = { GetOwner: () => owner };
  action.overlayName = "halo";
  action.path = "res:/unused.red";
  action.addOnStart = false;
  action.removeOnStop = false;
  action.Start(controller);
  assert.equal(action._overlay, overlay);
  assert.deepEqual(events, []);
  action.Stop(controller);
  assert.equal(action._overlay, null);
  assert.deepEqual(owner.overlays, [overlay]);
  action.removeOnStop = true;
  action.Stop(controller);
  assert.deepEqual(owner.overlays, [overlay]);
  action.Start(controller);
  action.Stop(controller);
  assert.deepEqual(owner.overlays, []);
  action.Start(controller);
  assert.equal(action._overlay, null);
  assert.throws(() => action.Start({}), TypeError);
  assert.doesNotThrow(() => action.Start({ GetOwner: () => null }));
});
