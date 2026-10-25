import assert from "node:assert/strict";
import test, { after } from "node:test";
import { Worker } from "node:worker_threads";
import { BeCallbackMan } from "../../npm/dist/global/blue/BlueCallbackMan.js";
import { CjsBlueResMan } from "../../npm/dist/global/blue/index.js";
import * as CcpLog from "../../npm/dist/global/logging/ccpLog.js";
import { CjsPngFormat } from "../../npm/dist/resource/formats/png/index.js";
import { ImageIO } from "../../npm/dist/resource/imageio/index.js";
import { IMAGE_DECODE_CALLBACK_MODULES, DECODE_BITMAP_CALLBACK } from "../../npm/dist/resource/imageio/imageDecodeCallbacks.js";
import { HostBitmap, LoadParameters, Metadata } from "../../npm/dist/global/imageio/index.js";
import { RegisterTextureResources } from "../../npm/dist/trinity/resources/texture/index.js";

// Carbon decodes a texture on resMan's background queue, which is BeCallbackMan
// (BlueResMan.cpp:109). Here BeCallbackMan is started as a composition would
// start it - the image job registered, two worker threads - and a PNG texture
// load must decode as that job on a worker.

BeCallbackMan.RegisterCallbackModule(DECODE_BITMAP_CALLBACK, IMAGE_DECODE_CALLBACK_MODULES[DECODE_BITMAP_CALLBACK]);
BeCallbackMan.SetThreadCount(2);
BeCallbackMan.SetWorkerModule("callback-man-thread.mjs").SetWorkerFactory(() =>
{
  const thread = new Worker(new URL("./fixtures/callback-man-thread.mjs", import.meta.url));
  const listeners = new Map();
  return {
    postMessage: (message, transfer) => thread.postMessage(message, transfer),
    terminate() { void thread.terminate(); },
    addEventListener(type, callback) {
      const fn = value => callback(type === "message" ? { data: value } : { error: value, message: String(value) });
      listeners.set(type, fn); thread.on(type, fn);
    },
    removeEventListener(type) { thread.off(type, listeners.get(type)); listeners.delete(type); }
  };
}).Start(true);
after(() => BeCallbackMan.Stop());

test("a PNG texture decodes as BeCallbackMan's image.decodeBitmap job on a worker, matching ImageIO", async t =>
{
  ImageIO.registerImageHandler(CjsPngFormat);
  const rgba = Uint8Array.from({ length: 6 * 4 * 4 }, (_, i) => (i * 53 + 7) & 255);
  const png = await CjsPngFormat.writeAsync({ width: 6, height: 4, data: rgba });

  const jobs = [];
  const echo = (channel, _type, userData, _message) => { if (channel.object === "CallbackMan" && userData && userData.event === "started") jobs.push(userData); };
  CcpLog.RegisterLogEcho(echo);
  t.after(() => { CcpLog.UnregisterLogEcho(echo); BeCallbackMan.constructor.CALLBACKMAN_DEBUGGING = false; });
  BeCallbackMan.constructor.CALLBACKMAN_DEBUGGING = true;

  const manager = new CjsBlueResMan({ source: { Read: () => png } });
  RegisterTextureResources(manager);
  const image = await manager.FetchResource("res:/worker.png", { ex: "raw" });

  assert.ok(jobs.some(job => job.label === DECODE_BITMAP_CALLBACK && job.subtitle === "BeCallbackMan" && /^BeCallbackMan_\d$/u.test(job.thread)),
    "the decode ran on one of BeCallbackMan's workers");
  const main = new HostBitmap();
  assert.ok((await ImageIO.readImageAsync(png, new LoadParameters("res:/worker.png"), main, new Metadata())).IsOk());
  const bitmap = image.GetBitmap();
  assert.equal(bitmap.GetFormat(), main.GetFormat());
  assert.equal(bitmap.GetWidth(), 6);
  assert.deepEqual(Array.from(bitmap.GetRawData()), Array.from(main.GetRawData()));
});
