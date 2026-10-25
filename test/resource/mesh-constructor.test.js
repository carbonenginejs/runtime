import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlueResMan, CjsMeshConstructor, MeshPrefix, RegisterMeshConstructor, TriGeometryRes } from "../../npm/dist/resource/index.js";
import { CjsCmfFormat } from "../../npm/dist/resource/formats/cmf/CjsCmfFormat.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/CjsGr2Format.js";

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

function managerServing(files)
{
  const resMan = new CjsBlueResMan();
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
    const resMan = managerServing({ [path]: bytes() });
    const geometry = resMan.GetResource(`dynamic:/mesh/1/${path}`);
    await geometry.Ready();

    assert.equal(geometry.IsGood(), true);
    const meshes = geometry.GetPayload().meshes;
    assert.deepEqual(meshes.map(mesh => mesh.name), [ "walkway" ]);
    assert.deepEqual(Array.from(meshes[0].bounds.min), [ 10, 0, 0 ]);
    assert.deepEqual(Array.from(meshes[0].bounds.max), [ 11, 1, 0 ]);
    assert.equal(resMan.GetResource(`dynamic:/mesh/1/${path}`), geometry, "one resource per path");
    assert.notEqual(resMan.GetResource(`dynamic:/mesh/0/${path}`), geometry, "the index is in the identity");
  });
}

test("a malformed path, a missing source and an absent mesh fail the resource", async () =>
{
  const resMan = managerServing({ "res:/x/walkway.gr2": CjsGr2Format.writeShared(sharedRoot()) });

  const malformed = resMan.GetResource("dynamic:/mesh/res:/x/walkway.gr2");
  assert.equal(malformed.IsFailed(), true);
  assert.equal(malformed.error.code, "CJS_GEOMETRY_DYNAMIC_PATH_INVALID");

  const constructor = new CjsMeshConstructor(resMan);
  const missing = new TriGeometryRes();
  missing.Initialize("dynamic:/mesh/0/res:/x/missing.gr2", "");
  assert.equal(await constructor.Load(missing, 0, "res:/x/missing.gr2"), false);
  assert.equal(missing.IsFailed(), true);

  const absent = new TriGeometryRes();
  absent.Initialize("dynamic:/mesh/2/res:/x/walkway.gr2", "");
  assert.equal(await constructor.Load(absent, 2, "res:/x/walkway.gr2"), false);
  assert.ok(absent.error instanceof RangeError);
});
