import assert from "node:assert/strict";
import { test } from "node:test";
import { blue, BlueResMan } from "../../../npm/dist/blue/blue/index.js";
import { getMotherLodeKey } from "../../../npm/dist/resource/index.js";
import * as CcpLog from "../../../npm/dist/global/logging/ccpLog.js";
import { RegisterDataLoader } from "../../support/testDataRes.js";
import "../../support/frameLoop.js";

// resMan logs each resource's load at its events on its "ResMan" channel, with
// the resource's MotherLode key as the saga (resman-in-the-browser.md).

/** Collects resMan's resource lines until the test ends. */
function recordResourceLines(t)
{
  const lines = [];
  const echo = (channel, type, userData, message) =>
  {
    if (channel.object === "ResMan" && userData && typeof userData === "object") lines.push({ type, message, ...userData });
  };
  CcpLog.RegisterLogEcho(echo, CcpLog.LogType.LOGTYPE_INFO);
  t.after(() => CcpLog.UnregisterLogEcho(echo));
  return lines;
}

/** A manager installed as Blue's, serving one data extension through a test Res class. */
function manager(t, loader)
{
  const previous = blue.resMan;
  const resMan = new BlueResMan({ source: { Read: () => new Uint8Array([ 1, 2, 3 ]) } });
  blue.resMan = resMan;
  t.after(() => { try { resMan.Clear(); } finally { blue.resMan = previous; } });
  RegisterDataLoader(resMan, "bin", loader);
  return resMan;
}

test("one load is one saga: requested, read, decoded, prepared, keyed by path plus ex", async t =>
{
  const lines = recordResourceLines(t);
  const resMan = manager(t, bytes => ({ length: bytes.length }));
  const path = "res:/log/one.bin";

  const resource = resMan.GetResource(path);
  await resMan.Ready(resource);

  const saga = getMotherLodeKey(path, "");
  const story = lines.filter(line => line.saga === saga);
  assert.deepEqual(story.map(line => line.event), [ "requested", "read", "decoded", "prepared" ]);
  for (const line of story)
  {
    assert.equal(line.type, CcpLog.LogType.LOGTYPE_INFO);
    assert.equal(line.subtitle, "resMan");
    assert.equal(line.label, path);
  }
  assert.match(story[1].message, /Read res:\/log\/one\.bin \(3 bytes\)/u);
  assert.equal(lines.some(line => line.saga !== saga), false, "no other resource logged");
});

test("a failed load ends its saga with failed, naming the error", async t =>
{
  const lines = recordResourceLines(t);
  const resMan = manager(t, () => { throw new Error("bad bytes"); });
  const path = "res:/log/broken.bin";

  await assert.rejects(resMan.FetchResource(path), /bad bytes/u);

  const story = lines.filter(line => line.saga === getMotherLodeKey(path, ""));
  assert.deepEqual(story.map(line => line.event), [ "requested", "read", "failed" ]);
  assert.match(story.at(-1).message, /Failed res:\/log\/broken\.bin: bad bytes/u);
});

test("a reload continues the same saga", async t =>
{
  const lines = recordResourceLines(t);
  const resMan = manager(t, bytes => bytes.length);
  const path = "res:/log/again.bin";
  const resource = await resMan.FetchResource(path);

  resource.Reload();
  await resMan.Ready(resource);

  const events = lines.filter(line => line.saga === getMotherLodeKey(path, "")).map(line => line.event);
  assert.deepEqual(events, [ "requested", "read", "decoded", "prepared", "reloaded", "read", "decoded", "prepared" ]);
});
