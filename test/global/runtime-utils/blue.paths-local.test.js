import assert from "node:assert/strict";
import { test } from "node:test";

import { blue } from "../../../npm/dist/global/blue/index.js";
import { localFileSystem } from "../../support/localFileSystem.js";

// Carbon's FileExistsLocally asks whether a file's bytes are on this machine
// (BluePaths.cpp:170-206). Loading a resource does not answer it: the
// resource manager's holdings are a different cache, one level up. Only an
// installed local file system or remote cache says a file is here.

test("FileExistsLocally is stored bytes, not what the resource manager holds", async () =>
{
  blue.resMan.Register({ source: { Read: () => Promise.resolve("{\"ok\":true}") } });
  blue.resMan.RegisterObjectLoader("json", value => JSON.parse(value));

  const path = "res:/paths/fetched.json";
  const resource = blue.resMan.GetResource(path);
  await resource.Ready();

  assert.equal(blue.paths.FileExistsLocally(path), false, "loaded is not local");

  blue.paths.SetLocalFileSystem(localFileSystem([ path ]));
  try
  {
    assert.equal(blue.paths.FileExistsLocally(path), true, "the local file system says it is here");
    assert.equal(blue.paths.FileExistsLocally("res:/paths/never.json"), false);
  }
  finally
  {
    blue.paths.SetLocalFileSystem(null);
  }
});
