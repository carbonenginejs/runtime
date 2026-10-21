import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { EveChildSocket, EveChildPlug, EveChildContainer } from "../../npm/dist/trinity/index.js";
import * as CcpLog from "../../npm/dist/global/logging/ccpLog.js";

const tick = () => new Promise(resolve => setImmediate(resolve));
function loader(t)
{
  const previous = blue.resMan.LoadObject;
  const requests = [];
  blue.resMan.LoadObject = path => new Promise((resolve, reject) => requests.push({path,resolve,reject}));
  t.after(() => { blue.resMan.LoadObject = previous; });
  return requests;
}

test("socket hydration loads without a hook and replays calls after native registration and binding", async t =>
{
  const requests = loader(t);
  const socket = CjsSchema.from("EveChildSocket", {_type: "EveChildSocket", resPath: "res:/plug.red"});
  assert.ok(requests.length > 0, "hydration starts the authored load");
  assert.equal(Object.hasOwn(socket,"resourceLoader"), false);
  const owner = {};
  socket.SetOwner(owner);
  socket.SetPartTag(17);
  const calls = [];
  const plug = new EveChildPlug();
  plug.SetControllerVariable = (name, value) => calls.push([name,value]);
  plug.StartControllers = () => calls.push(["start"]);
  plug.HandleControllerEvent = name => calls.push(["event",name]);
  socket.RegisterComponents = () => calls.push(["register", socket.plug.GetParent() === socket]);
  socket.BindParameters = () => calls.push(["bind"]);
  socket.Propogate = () => calls.push(["propagate"]);
  socket.SetControllerVariable("heat", 2);
  socket.StartControllers();
  socket.HandleControllerEvent("fire");
  for (const request of requests.slice(0, -1)) request.resolve(new EveChildPlug());
  requests.at(-1).resolve(plug);
  await tick();
  assert.equal(socket.plug, plug);
  assert.equal(plug.GetOwner(), owner);
  assert.equal(plug.GetPartTag(),17);
  assert.deepEqual(calls, [["register",true],["bind"],["propagate"],["heat",2],["start"],["event","fire"]],
    "EveChildSocket.cpp:479-500 registers before Initialize:185-191 binds/propagates");
});

test("socket reload unregisters immediately and rejects stale same-path and cleared-path loads", async t =>
{
  const requests = loader(t);
  const socket = new EveChildSocket();
  const old = new EveChildPlug();
  socket.plug = old;
  socket.RegisterChild(old);
  socket.resPath = "res:/plug.red";
  let unregistered = 0;
  socket.UnRegisterComponents = () => { unregistered++; };
  assert.equal(socket.Reload(), undefined, "native Reload returns void");
  assert.equal(socket.plug,null);
  assert.equal(old.GetParent(),null);
  socket.Reload();
  const current = new EveChildPlug();
  requests[1].resolve(current);
  await tick();
  requests[0].resolve(new EveChildPlug());
  await tick();
  assert.equal(socket.plug,current);
  socket.Reload();
  socket.resPath = "";
  socket.OnModified("resPath");
  requests[2].resolve(new EveChildPlug());
  await tick();
  assert.equal(socket.plug,null);
  assert.equal(unregistered,4);
});

test("socket initialization remains true on failed or wrong-type loads and preserves native diagnostics", async t =>
{
  const requests = loader(t);
  const messages = [];
  const echo = (channel,type,data,message) => messages.push(message);
  CcpLog.RegisterLogEcho(echo);
  t.after(() => CcpLog.UnregisterLogEcho(echo));
  const socket = new EveChildSocket();
  socket.resPath = "res:/invalid.red";
  assert.equal(socket.Initialize(),true);
  requests[0].resolve(new EveChildContainer());
  await tick();
  assert.equal(socket.plug,null);
  assert.equal(socket.Initialize(),true);
  requests[1].reject(new Error("missing resource"));
  await tick();
  assert.equal(socket.plug,null);
  assert.equal(messages.filter(message => message === "Red file res:/invalid.red is invalid or not an Eve Child type.").length,2);
  blue.resMan.LoadObject = () => { throw new Error("synchronous source failure"); };
  assert.equal(socket.Initialize(),true);
  await tick();
  assert.equal(socket.plug,null);
});

test("native path setter reloads changed paths without binding while Initialize binds", async t =>
{
  const requests = loader(t);
  const socket = new EveChildSocket();
  let bindings = 0;
  socket.BindParameters = () => { bindings++; };
  socket.SetPlugResPath("res:/plug.red");
  socket.SetPlugResPath("res:/plug.red");
  assert.equal(requests.length,1);
  assert.equal(socket.GetPlugResPath(),"res:/plug.red");
  requests[0].resolve(new EveChildPlug());
  await tick();
  assert.equal(bindings,0, "EveChildSocket.cpp:33-40 calls LoadChild only");
  socket.Initialize();
  requests[1].resolve(new EveChildPlug());
  await tick();
  assert.equal(bindings,1);
});
