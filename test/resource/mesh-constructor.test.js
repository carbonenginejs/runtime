import { blue } from "../../npm/dist/blue/blue/index.js";
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { BlueResMan, CjsMeshConstructor, MeshPrefix, RegisterMeshConstructor, TriGeometryRes } from "../../npm/dist/resource/index.js";
import { CjsCmfFormat } from "../../npm/dist/resource/formats/cmf/CjsCmfFormat.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/CjsGr2Format.js";
import { configureResourceManager } from "../support/configuredResMan.js";
import "../support/frameLoop.js";

/**
 * `dynamic:/mesh/<meshIndex>/<source>` holds one mesh of a `.gr2` or `.cmf`
 * file as a geometry resource of its own, read through the manager's source.
 */

function triangle(offset)
{
  return [ offset, 0, 0, offset + 1, 0, 0, offset, 1, 0 ];
}

function sharedRoot()
{
  return {
    meshes: [ "rail", "walkway" ].map((name, index) => ({
      name,
      // A .cmf file carries these; a .gr2 file has none, and they are rebuilt.
      minBounds: [ index * 10, 0, 0 ],
      maxBounds: [ index * 10 + 1, 1, 0 ],
      vertex: { position: triangle(index * 10) },
      indices: [ { name: "a", bytesPerIndex: 2, faces: [ 0, 1, 2 ] } ]
    }))
  };
}

/** A manager configured as the application's (CjsLibrary's gr2 route), reading these files. */
async function managerServing(files)
{
  const resMan = await configureResourceManager(new BlueResMan());
  resMan.Register({ source: { Read: path => path in files ? Promise.resolve(files[path]) : Promise.reject(new Error(`no ${path}`)) } });
  RegisterMeshConstructor(resMan);
  return resMan;
}

test("parses a mesh index and a gr2 or cmf source", () =>
{
  assert.deepEqual(CjsMeshConstructor.parseQuery("1/res:/a/b.gr2"), { meshIndex: 1, path: "res:/a/b.gr2" });
  assert.deepEqual(CjsMeshConstructor.parseQuery("0/res:/a/b.CMF"), { meshIndex: 0, path: "res:/a/b.CMF" });
  for (const query of [ "res:/a/b.gr2", "x/res:/a/b.gr2", "-1/res:/a/b.gr2", "1/res:/a/b.dds", "1/" ])
  {
    assert.equal(CjsMeshConstructor.parseQuery(query), null, query);
  }
  assert.equal(CjsMeshConstructor.meshPath(1, "res:/a/b.gr2"), `${MeshPrefix}1/res:/a/b.gr2`);
});

for (const [ label, path, bytes ] of [
  [ "gr2", "res:/x/walkway.gr2", () => CjsGr2Format.writeShared(sharedRoot()) ],
  [ "cmf", "res:/x/walkway.cmf", () => CjsCmfFormat.writeShared(sharedRoot()) ]
])
{
  test(`a ${label} source gives the indexed mesh alone, with bounds`, async () =>
  {
    const resMan = await managerServing({ [path]: bytes() });
    const geometry = resMan.GetResource(`dynamic:/mesh/1/${path}`);
    await resMan.Ready(geometry);

    assert.equal(geometry.IsGood(), true);
    assert.equal(geometry.GetMeshCount(), 1);
    const mesh = geometry.GetMeshData(0);
    assert.equal(mesh.name, "walkway");
    assert.deepEqual(Array.from(mesh.minBounds), [ 10, 0, 0 ]);
    assert.deepEqual(Array.from(mesh.maxBounds), [ 11, 1, 0 ]);
    assert.equal(resMan.GetResource(`dynamic:/mesh/1/${path}`), geometry, "one resource per path");
    assert.notEqual(resMan.GetResource(`dynamic:/mesh/0/${path}`), geometry, "the index is in the identity");
  });
}

test("a malformed path, a missing source and an absent mesh fail the resource", async () =>
{
  const resMan = await managerServing({ "res:/x/walkway.gr2": CjsGr2Format.writeShared(sharedRoot()) });
  const malformed = resMan.GetResource("dynamic:/mesh/res:/x/walkway.gr2");
  await assert.rejects(resMan.Ready(malformed), error => error.code === "CJS_GEOMETRY_DYNAMIC_PATH_INVALID");
  assert.equal(malformed.IsPrepared(), true);
  assert.equal(malformed.IsGood(), false);
  const missing = resMan.GetResource("dynamic:/mesh/0/res:/x/missing.gr2");
  await assert.rejects(resMan.Ready(missing), /no res:/);
  const absent = resMan.GetResource("dynamic:/mesh/2/res:/x/walkway.gr2");
  await assert.rejects(resMan.Ready(absent), RangeError);
});

let previousManager;
beforeEach(() => { previousManager = blue.resMan; });
afterEach(() => { try { blue.resMan.Clear(); } finally { blue.resMan = previousManager; } });
