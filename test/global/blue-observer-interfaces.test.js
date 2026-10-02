import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  IBlueEventListener, IBluePlacementObserver, IBlueMultiPlacementObserver, PositionDescription, blue
} from "@carbonenginejs/runtime/blue";
import { CjsSchema, meta } from "@carbonenginejs/runtime/schema";
import { vec3 } from "@carbonenginejs/runtime/math/vec3";
import { IBlueEventListener as DirectListener } from "../../src/global/blue/IBlueEventListener.js";
import { IBluePlacementObserver as DirectObserver } from "../../src/global/blue/IBluePlacementObserver.js";
import { IBlueMultiPlacementObserver as DirectMultiObserver } from "../../src/global/blue/IBlueMultiPlacementObserver.js";
import { PositionDescription as DirectPosition } from "../../src/global/blue/PositionDescription.js";
import { mappedInterfaces } from "../../src/global/compose/interface.js";

test("Blue observer interfaces register one identity and only their native abstract methods", () =>
{
  for (const [Type, direct, name, method] of [
    [IBlueEventListener, DirectListener, "IBlueEventListener", "HandleEvent"],
    [IBluePlacementObserver, DirectObserver, "IBluePlacementObserver", "UpdatePlacement"],
    [IBlueMultiPlacementObserver, DirectMultiObserver, "IBlueMultiPlacementObserver", "UpdatePlacements"]
  ])
  {
    assert.equal(Type, direct);
    assert.equal(CjsSchema.getClassName(Type), name);
    assert.equal(CjsSchema.GetConstructor(name), Type);
    assert.equal(blue.classes.GetClassRegistration(name).type, Type);
    assert.equal(CjsSchema.getMethod(Type, method).impl.status, "abstract");
    assert.deepEqual(CjsSchema.getSchema(Type).members, []);
    assert.deepEqual(CjsSchema.getSchema(Type).properties, []);
    assert.deepEqual(Object.getOwnPropertyNames(Type.prototype), ["constructor", method]);
    assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
    assert.deepEqual(Array.from(mappedInterfaces(Type)), []);
  }
});

test("Blue observer interfaces fail when their pure operations are unimplemented", () =>
{
  class MissingListener extends IBlueEventListener {}
  class MissingObserver extends IBluePlacementObserver {}
  class MissingMultiObserver extends IBlueMultiPlacementObserver {}
  for (const listener of [new IBlueEventListener(), new MissingListener()])
  {
    assert.throws(() => listener.HandleEvent("event"), /IBlueEventListener\.HandleEvent must be implemented/u);
  }
  for (const observer of [new IBluePlacementObserver(), new MissingObserver()])
  {
    assert.throws(() => observer.UpdatePlacement(null, null, null), /IBluePlacementObserver\.UpdatePlacement must be implemented/u);
  }
  for (const observer of [new IBlueMultiPlacementObserver(), new MissingMultiObserver()])
  {
    assert.throws(() => observer.UpdatePlacements([]), /IBlueMultiPlacementObserver\.UpdatePlacements must be implemented/u);
  }
});

test("PositionDescription is an unregistered native-shaped aggregate value record", () =>
{
  assert.equal(PositionDescription, DirectPosition);
  const position = new PositionDescription();
  assert.deepEqual(Object.keys(position), ["front_x", "front_y", "front_z", "pos_x", "pos_y", "pos_z"]);
  assert.deepEqual(Object.values(position), [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(Object.getOwnPropertyNames(PositionDescription.prototype), ["constructor"]);
  assert.equal(Object.getPrototypeOf(PositionDescription.prototype), Object.prototype);
  assert.equal(CjsSchema.getClassName(PositionDescription), null);
  assert.equal(CjsSchema.GetConstructor("PositionDescription"), null);
  assert.equal(blue.classes.GetClassRegistration("PositionDescription"), null);
  position.front_z = 1;
  position.pos_x = 3.5;
  assert.equal(new PositionDescription().pos_x, 0);
  assert.equal("Initialize" in position, false);
  assert.equal("SetValues" in position, false);
});

test("multi-placement composition preserves the caller's ordered records without implicit query exposure", () =>
{
  const received = [];
  class MultiObserver
  {
    UpdatePlacements(positions)
    {
      received.push(positions);
    }
  }
  const implementation = MultiObserver.prototype.UpdatePlacements;
  meta.blue.inherit(IBlueMultiPlacementObserver)(MultiObserver, { kind: "class" });
  CjsSchema.define(MultiObserver, { className: "TestBlueMultiPlacementObserverProvider" });
  const observer = new MultiObserver();
  const first = new PositionDescription();
  first.front_z = 1;
  first.pos_x = 12;
  const second = new PositionDescription();
  second.front_x = 1;
  second.pos_y = -5;
  const positions = [first, second];
  assert.equal(observer.UpdatePlacements(positions), undefined);
  assert.equal(MultiObserver.prototype.UpdatePlacements, implementation);
  assert.equal(received[0], positions);
  assert.equal(received[0][0], first);
  assert.equal(received[0][1], second);
  assert.equal(first.pos_x, 12);
  assert.equal(second.pos_y, -5);
  assert.equal(CjsSchema.cast(observer, IBlueMultiPlacementObserver), observer);
  assert.equal(CjsSchema.cast({ UpdatePlacements() {} }, IBlueMultiPlacementObserver), null);
  assert.equal(mappedInterfaces(MultiObserver).has(IBlueMultiPlacementObserver), false);
  meta.blue.interfaceTable({ interfaces: [IBlueMultiPlacementObserver], chainTo: null })(MultiObserver);
  assert.deepEqual(mappedInterfaces(MultiObserver), new Set([IBlueMultiPlacementObserver]));
});

test("Blue observer composition retains concrete calls and requires explicit query exposure", () =>
{
  const calls = [];
  class Observer
  {
    HandleEvent(eventName)
    {
      calls.push(["event", eventName]);
    }

    UpdatePlacement(front, top, position)
    {
      calls.push(["placement", front, top, position]);
    }
  }
  const handleEvent = Observer.prototype.HandleEvent;
  const updatePlacement = Observer.prototype.UpdatePlacement;
  meta.blue.inherit(IBlueEventListener, IBluePlacementObserver)(Observer, { kind: "class" });
  CjsSchema.define(Observer, { className: "TestBlueObserverInterfaceProvider" });

  const observer = new Observer();
  assert.equal(Observer.prototype.HandleEvent, handleEvent);
  assert.equal(Observer.prototype.UpdatePlacement, updatePlacement);
  assert.equal(CjsSchema.cast(observer, IBlueEventListener), observer);
  assert.equal(CjsSchema.cast(observer, IBluePlacementObserver), observer);
  assert.equal(CjsSchema.cast({ HandleEvent() {} }, IBlueEventListener), null);
  assert.equal(mappedInterfaces(Observer).has(IBlueEventListener), false);
  assert.equal(mappedInterfaces(Observer).has(IBluePlacementObserver), false);

  const eventName = "音楽_\u{1f3b5}";
  const front = vec3.fromValues(0, 0, 1);
  const top = vec3.fromValues(0, 1, 0);
  const position = vec3.fromValues(12, -3, 4);
  assert.equal(observer.HandleEvent(eventName), undefined);
  assert.equal(observer.UpdatePlacement(front, top, position), undefined);
  assert.deepEqual(calls, [["event", eventName], ["placement", front, top, position]]);
  assert.equal(calls[1][1], front);
  assert.equal(calls[1][2], top);
  assert.equal(calls[1][3], position);
  assert.deepEqual(Array.from(position), [12, -3, 4]);

  meta.blue.interfaceTable({ interfaces: [IBlueEventListener, IBluePlacementObserver], chainTo: null })(Observer);
  assert.deepEqual(mappedInterfaces(Observer), new Set([IBlueEventListener, IBluePlacementObserver]));
  assert.equal("Initialize" in observer, false);
  assert.equal("SetValues" in observer, false);
});

test("Blue observer contracts import without domain evaluation or operational startup", () =>
{
  const guard = String.raw`
    export async function load(url, context, nextLoad)
    {
      if (/\/(?:src|dist)\/(?:audio|character|trinity|trinityal|sof)\//.test(url)
        || /\/(?:src|dist)\/global\/model\//.test(url))
      {
        throw new Error("Observer contract import reached a domain or model: " + url);
      }
      return nextLoad(url, context);
    }
  `;
  const probe = spawnSync(process.execPath, [
    ...process.execArgv,
    "--experimental-loader", `data:text/javascript,${encodeURIComponent(guard)}`,
    "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      for (const name of ["document", "window", "navigator", "AudioContext", "webkitAudioContext", "Worker"])
      {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error("Observer contract import touched " + name); }
        });
      }
      for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
      {
        globalThis[name] = () => { throw new Error("Observer contract import started " + name); };
      }
      const shared = await import("@carbonenginejs/runtime/blue");
      const { CjsSchema } = await import("@carbonenginejs/runtime/schema");
      assert.equal(CjsSchema.GetConstructor("IBlueEventListener"), shared.IBlueEventListener);
      assert.equal(CjsSchema.GetConstructor("IBluePlacementObserver"), shared.IBluePlacementObserver);
      assert.equal(CjsSchema.GetConstructor("IBlueMultiPlacementObserver"), shared.IBlueMultiPlacementObserver);
      assert.equal(CjsSchema.GetConstructor("PositionDescription"), null);
      assert.equal(shared.blue.os.GetInfo().pumpTicksTotal, 0);
      assert.equal(shared.blue.resMan.GetPendingLoads(), 0);
      assert.equal(shared.blue.resMan.GetPendingPrepares(), 0);
      assert.equal(shared.blue.resMan.workerLoader.worker, null);
    `
  ], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8"
  });
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
