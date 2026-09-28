import test from "node:test";
import assert from "node:assert/strict";
import { CjsAudioSystem, CjsMusicEngine, ICjsMusicEngine } from "../../../npm/dist/audio/index.js";
import { MusicEngineWith } from "../../support/audioStub.js";

const METHODS = Object.getOwnPropertyNames(ICjsMusicEngine.prototype).filter(name => name !== "constructor");

test("CjsMusicEngine implements every ICjsMusicEngine method itself", () =>
{
  // An inherited method would be the interface's throwing default.
  assert.equal(METHODS.length, 15);
  const missing = METHODS.filter(name => !Object.hasOwn(CjsMusicEngine.prototype, name));
  assert.deepEqual(missing, [], `CjsMusicEngine lacks ${missing.join(", ")}`);
});

test("an injected music engine must declare the whole interface", () =>
{
  const engine = MusicEngineWith();
  assert.equal(CjsAudioSystem.ValidateMusicEngine(engine), engine);
  assert.equal(CjsAudioSystem.ValidateMusicEngine(null), null);

  const partial = {
    HandlesEvent: () => false,
    PostEvent: () => false,
    ExecuteAction() {},
    Process() {},
    Dispose() {},
  };
  assert.throws(
    () => CjsAudioSystem.ValidateMusicEngine(partial),
    /Missing: GetSourcePlayPosition, SetSwitch, SetState, SetMusicVolume/u,
  );
});

test("an interface method left unimplemented throws instead of doing nothing", () =>
{
  class Incomplete extends ICjsMusicEngine {}
  assert.throws(() => new Incomplete().Process(), /must be overridden/u);
});
