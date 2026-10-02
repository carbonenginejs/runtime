// CjsSofLibraryBuilder: a material the file index does not list is absent,
// as Carbon's EveSOFDataMgr::GetMaterialData answers nullptr for an unknown
// name (EveSOFDataMgr.cpp:273-281). Shipped factions name materials that do
// not exist: factions/lavatiger.black names `rock_lightgray_sand`, and the
// client has `rock_lightgrey_sand`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSofLibraryBuilder, EveSOFDataMgr } from "../../../npm/dist/sof/index.js";

const MISSING = "rock_lightgray_sand";
const LISTED = "rock_lightgrey_sand";

/** A builder whose manager already holds generic data, so no boot read runs. */
function builder({ exists = null, reads = [] } = {})
{
  const dataMgr = new EveSOFDataMgr();
  assert.equal(dataMgr.SetData({ generic: {} }), true);
  const source = path =>
  {
    reads.push(path);
    return Promise.reject(new Error(`${path}: 502 Bad Gateway`));
  };
  return new CjsSofLibraryBuilder({ dataMgr, source, exists });
}

test("a material the index does not list resolves to absent, reported once", async () =>
{
  const reads = [];
  const lib = builder({ exists: path => !path.includes(MISSING), reads });

  assert.equal(await lib.FetchMaterial(MISSING), null);
  assert.equal(await lib.FetchMaterial(MISSING), null);
  assert.deepEqual(reads, [], "nothing is fetched for a name the index lacks");
  assert.equal(lib._absentReported.size, 1, "logged once per name");
});

test("a listed material whose fetch fails still rejects", async () =>
{
  // Negative control: the index lists it, so a failed read is a real failure,
  // not an absent material.
  const lib = builder({ exists: path => !path.includes(MISSING) });

  await assert.rejects(lib.FetchMaterial(LISTED), /502 Bad Gateway/u);
});

test("without an index probe a failed fetch rejects, as before", async () =>
{
  const lib = builder();

  await assert.rejects(lib.FetchMaterial(MISSING), /502 Bad Gateway/u);
  assert.throws(() => builder({ exists: "yes" }), /exists must be a function/u);
});

test("an asynchronous index probe shares one in-flight lookup and preserves errors", async () =>
{
  let probes = 0;
  const reads = [];
  const lib = builder({ exists: async path => { probes++; return !path.includes(MISSING); }, reads });
  assert.deepEqual(await Promise.all([lib.FetchMaterial(MISSING), lib.FetchMaterial(MISSING)]), [null, null]);
  assert.equal(probes, 1);
  assert.deepEqual(reads, []);
  await assert.rejects(lib.FetchMaterial(LISTED), /502 Bad Gateway/u);
  const broken = builder({ exists: async () => { throw new Error("index offline"); } });
  await assert.rejects(broken.FetchMaterial(MISSING), /index offline/u);
});

test("lazy SOF catalog exports through schema values after model removal", () =>
{
  const library = new CjsSofLibraryBuilder({ dataMgr: new EveSOFDataMgr(), source: async () => ({}) });
  assert.equal("GetValues" in library.data, false);
  assert.equal(library.GetValues({ forceTypeTags: true })._type, "EveSOFData");
});
