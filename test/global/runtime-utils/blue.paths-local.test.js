import assert from "node:assert/strict";
import { test } from "node:test";

import { blue } from "../../../npm/dist/global/blue/index.js";

// In a browser, "local" means already fetched: blue.js installs a predicate
// asking the resource manager whether it holds the resource with its data.

test("FileExistsLocally is 'already fetched' by default: false until the manager holds the data", async () =>
{
  blue.resMan.Register({ source: { Read: () => Promise.resolve("{\"ok\":true}") } });
  blue.resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/paths/fetched.json";

  assert.equal(blue.paths.FileExistsLocally(path), false, "never asked for");

  const resource = blue.resMan.GetResource(path);
  await resource.Ready();

  assert.equal(blue.paths.FileExistsLocally(path), true, "fetched and held");
  assert.equal(blue.paths.FileExistsLocally("res:/paths/never.json"), false);
});
