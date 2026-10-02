// Private offline fixtures only: set SOCKET_BLACK_CORPUS_DIR to copied files.
// Success uses synthetic callers and the unmodified published shipcaster plug;
// the actual Aurora socket separately proves the absent authored-path case.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue, CjsResMan } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { EveChildSocket, EveChildContainer } from "../../npm/dist/trinity/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import * as CcpLog from "../../npm/dist/global/logging/ccpLog.js";
import { StubResMan } from "../support/stubResMan.js";

const corpus = process.env.SOCKET_BLACK_CORPUS_DIR;
const skip = !corpus && "set SOCKET_BLACK_CORPUS_DIR for the published plug and real Aurora proofs";
async function fixture(name, size, md5)
{
  const bytes = await readFile(join(corpus,name));
  assert.equal(bytes.length,size);
  assert.equal(createHash("md5").update(bytes).digest("hex"),md5);
  return bytes;
}
function manager(t, read)
{
  const previous = blue.resMan;
  const result = new CjsResMan({source:{Read:read}});
  result.RegisterObjectBuilder("red", bytes => CjsBlackFormat.createObjectBuilder(bytes));
  const handles = new StubResMan();
  result.GetResource = handles.GetResource.bind(handles);
  blue.resMan = result;
  t.after(() => { blue.resMan = previous; });
  return result;
}
async function settle(resMan, ready)
{
  for(let turn=0;turn<100 && !ready();turn++)
  {
    resMan.PumpMainThreadQueue();
    await new Promise(resolve => setImmediate(resolve));
  }
}

test("synthetic sockets load independent published shipcaster plugs and bind their real external parameter", {skip}, async t =>
{
  const bytes = await fixture("plug_factional_shc_hologram_fx_01a.black",2228,"4b80eb59bd158e7413fb8ea0871e1e47");
  const path = "res:/dx9/model/deployables/generic/navigation/shipcaster/effects/plug_factional_shc_hologram_fx_01a.red";
  let reads = 0;
  const resMan = manager(t, requested => { assert.equal(requested,path); reads++; return bytes; });
  const sockets = [new EveChildSocket(),new EveChildSocket()];
  for(const socket of sockets) { socket.resPath=path; socket.Initialize(); }
  await settle(resMan, () => sockets.every(socket => socket.plug && socket._pendingPlugCalls === null));
  for(const socket of sockets)
  {
    assert.ok(socket.plug,"EveChildSocket.cpp:486 loads the typed plug without an optional hook");
    assert.equal(CjsSchema.getClassName(socket.plug.constructor),"EveChildPlug");
    assert.equal(socket.plug.GetParent(),socket);
    assert.equal(socket.parameters[0].GetName(),"Geo_Res_Path");
    assert.equal(socket.parameters[0].value,socket.plug.externalParameters[0].GetValue());
  }
  assert.equal(reads,1,"cached bytes are shared");
  assert.notEqual(sockets[0].plug,sockets[1].plug,"each caller owns a new plug");
  assert.notEqual(sockets[0].plug.objects[0],sockets[1].plug.objects[0]);
  const original = sockets[1].plug.externalParameters[0].GetValue();
  sockets[0].parameters[0].value = "res:/synthetic/independent.gr2";
  sockets[0].Propogate();
  assert.equal(sockets[0].plug.externalParameters[0].GetValue(),"res:/synthetic/independent.gr2");
  assert.equal(sockets[1].plug.externalParameters[0].GetValue(),original);
  t.diagnostic("real published EveChildPlug, synthetic sockets; no authored socket path was substituted");
});

test("real Aurora requests its absent authored plug and preserves its owner on failure", {skip}, async t =>
{
  const bytes = await fixture("gbc1_ccptv_fx.black",2991,"c007c2b0fffdcc130b64d4921d2c3fa6");
  const requests=[];
  const resMan = manager(t, path => { requests.push(path); throw new Error(`Resource file not found: ${path}`); });
  const messages=[];
  const echo = (channel,type,data,message) => messages.push(message);
  CcpLog.RegisterLogEcho(echo);
  t.after(() => CcpLog.UnregisterLogEcho(echo));
  const root = CjsSchema.from("EveChildContainer", CjsBlackFormat.readPayload(bytes).object);
  const aurora = root.objects.find(child=>child.name==="Aurora");
  assert.ok(aurora);
  const authored = "res:/dx9/model/Shared/fx/Skin/PLUG_Aurora01.red";
  assert.equal(aurora.resPath,authored);
  await settle(resMan, () => aurora._pendingPlugCalls === null);
  assert.ok(requests.some(path=>path.toLowerCase()===authored.toLowerCase()),"the absent file must actually be requested");
  assert.equal(aurora.plug,null);
  assert.equal(aurora.GetParent(),root);
  assert.equal(root.objects.includes(aurora),true);
  assert.equal(aurora.parameters.length,5);
  assert.ok(messages.includes(`Red file ${authored} is invalid or not an Eve Child type.`),"EveChildSocket.cpp:489 logs typed load failure");
});
