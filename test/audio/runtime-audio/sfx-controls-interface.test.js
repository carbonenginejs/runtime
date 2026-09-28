import test from "node:test";
import assert from "node:assert/strict";
import { ICjsSfxControls } from "../../../npm/dist/audio/index.js";
import { CjsAudioBackendSfxControls } from "../../../src/audio/internal/CjsAudioBackendSfxControls.js";
import { CjsSfxEngineRtpcOverlayControls } from "../../../src/audio/internal/CjsSfxEngineRtpcOverlayControls.js";
import { SfxControlsWith } from "../../support/audioStub.js";

const METHODS = Object.getOwnPropertyNames(ICjsSfxControls.prototype).filter(name => name !== "constructor");

test("both controls classes implement every ICjsSfxControls method themselves", () =>
{
  assert.equal(METHODS.length, 13);
  for (const Controls of [ CjsAudioBackendSfxControls, CjsSfxEngineRtpcOverlayControls ])
  {
    const missing = METHODS.filter(name => !Object.hasOwn(Controls.prototype, name));
    assert.deepEqual(missing, [], `${Controls.name} lacks ${missing.join(", ")}`);
  }
});

test("the RTPC overlay answers overlaid RTPCs itself and delegates everything else", () =>
{
  const calls = [];
  const signal = new AbortController().signal;
  const recorded = Object.fromEntries(METHODS.map(name => [ name, (...args) =>
  {
    calls.push([ name, ...args ]);
    return `${name}:base`;
  } ]));
  const base = SfxControlsWith({ ...recorded, gameObjID: 42, signal });
  const overlay = new CjsSfxEngineRtpcOverlayControls(
    base,
    new Map([ [ "object_rtpc", 3 ] ]),
    new Map([ [ "global_rtpc", 7 ] ]),
  );

  // Overlaid values win, and the base reader is not consulted for them.
  assert.equal(overlay.getRTPC("object_rtpc", 1), 3);
  assert.equal(overlay.getGlobalRTPC("global_rtpc", 1), 7);
  assert.deepEqual(calls, []);

  // A name the program did not set falls through to the post's reader.
  assert.equal(overlay.getRTPC("other", 1), "getRTPC:base");
  assert.equal(overlay.getGlobalRTPC("other", 1), "getGlobalRTPC:base");

  // Every other member is the post's, arguments intact.
  const args = [ "a", "b", "c", "d" ];
  for (const name of METHODS.filter(n => n !== "getRTPC" && n !== "getGlobalRTPC"))
  {
    calls.length = 0;
    const arity = base[name].length || ICjsSfxControls.prototype[name].length;
    const given = args.slice(0, arity);
    assert.equal(overlay[name](...given), `${name}:base`, name);
    assert.deepEqual(calls, [ [ name, ...given ] ], name);
  }
  assert.equal(overlay.gameObjID, 42);
  assert.equal(overlay.signal, signal);
});
