import assert from "node:assert/strict";
import test from "node:test";
import { createDemoActions } from "./webgpu/demo/demoActions.js";

function ship(states = ["warp"])
{
  return { states, variables: {}, speed: 0, GetControllerVariables() { return this.variables; } };
}

test("console and panel commands share live ship state and availability after replacement", () =>
{
  let current = ship();
  const changes = [], observed = [];
  const actions = createDemoActions({
    getShip: () => current,
    getShipStates: s => s.states.map(kind => ({ kind, names: [kind] })),
    readState: () => ({ speed: current.speed }),
    onShipChanged: (...args) => changes.push(args),
    operations: {
      speed: value => current.speed = value,
      setShipState: (kind, on) => current.variables[kind] = Number(on)
    }
  });
  const unsubscribe = actions.subscribe(state => observed.push(state));
  actions.invoke("speed", 1.5);
  actions.invoke("setShipState", "warp", true);
  assert.equal(observed.at(-1).speed, 1.5);
  assert.equal(observed.at(-1).shipStates[0].on, true);
  const previous = current;
  current = ship(["siege"]);
  actions.refresh();
  assert.deepEqual(changes, [[current, previous]]);
  assert.equal(actions.enabled("setShipState", "warp"), false);
  assert.equal(actions.enabled("setShipState", "siege"), true);
  const count = observed.length;
  unsubscribe();actions.invoke("speed", 2);
  assert.equal(observed.length, count);
});

test("async requests deduplicate, expose errors, and clear busy even after ship replacement", async () =>
{
  let current = ship(), reject, requests = 0;
  const actions = createDemoActions({getShip:()=>current,getShipStates:()=>[],readState:()=>({}),operations:{
    skin:()=>{requests++;return new Promise((_resolve,fail)=>{reject=fail;});},cloak:()=>{}
  }});
  const first=actions.invoke("skin"),duplicate=actions.invoke("skin");
  assert.equal(first,duplicate);assert.equal(requests,1);
  assert.equal(actions.enabled("cloak"),false);
  current=ship();actions.refresh();
  reject(Error("load failed"));await assert.rejects(first,/load failed/);
  assert.deepEqual(actions.getState().pending,[]);
  assert.equal(actions.getState().errors.skin,"load failed");
  assert.equal(actions.getState().ship,current);
  assert.equal(actions.enabled("cloak"),true);
});
