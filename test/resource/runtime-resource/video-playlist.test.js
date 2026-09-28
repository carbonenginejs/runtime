import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../../src/global/schema/index.js";
import { CjsResMan, RegisterVideoPlaylists, TriTextureRes, VideoPlaylistController } from "../../../src/resource/index.js";

function countingManager()
{
  const counter = { reads: 0 };
  const resMan = new CjsResMan({ source: { Read() { counter.reads += 1; return new Uint8Array(0); } } });
  return { resMan, counter };
}

test("a playlist resolves to one shared texture per name and reads no source", () =>
{
  const { resMan, counter } = countingManager();
  RegisterVideoPlaylists(resMan, {
    InSpaceVideos: [ "res:/video/a.webm", "res:/video/b.webm" ],
    hangarvideos: [ "res:/video/c.webm" ]
  });

  const inSpace = resMan.GetResource("dynamic:/inspacevideos");
  assert.equal(CjsSchema.cast(inSpace, TriTextureRes), inSpace);
  assert.equal(inSpace.IsGood(), true);
  // Shared: every plane naming the list gets the same texture.
  assert.equal(resMan.GetResource("dynamic:/inspacevideos"), inSpace);
  // Negative control: a different list is a different texture.
  assert.notEqual(resMan.GetResource("dynamic:/hangarvideos"), inSpace);
  assert.equal(counter.reads, 0);
});

test("each list is shuffled once at registration, and an empty list unregisters its name", () =>
{
  const { resMan } = countingManager();
  const registered = new Map();
  const recording = {
    RegisterResourceConstructor: (name, constructor) => registered.set(name, constructor),
    UnregisterResourceConstructor: name => registered.set(name, null)
  };
  // random() = 0 swaps every element with the first: [a, b, c] -> [b, c, a].
  RegisterVideoPlaylists(recording, { list: [ "a", "b", "c" ], gone: [] }, { random: () => 0 });
  assert.deepEqual(CjsSchema.cast(registered.get("list"), VideoPlaylistController).playlist, [ "b", "c", "a" ]);
  assert.equal(registered.get("gone"), null);

  RegisterVideoPlaylists(resMan, { list: [ "res:/video/a.webm" ] });
  RegisterVideoPlaylists(resMan, { list: [] });
  assert.throws(() => resMan.GetResource("dynamic:/list"));
});

test("a playlist needs at least one video", () =>
{
  assert.throws(() => new VideoPlaylistController([]), TypeError);
});
