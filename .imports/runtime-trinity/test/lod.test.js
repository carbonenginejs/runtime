import test from "node:test";
import assert from "node:assert/strict";
import { Tr2Mesh, Tr2MeshArea } from "../npm/dist/index.js";


// Carbon Tr2MeshBase::UseWithScreenSize (cpp:589-610) resolves the LOD for the
// reported size and hands that LOD's uv densities to every area material, which
// is what lets the texture streamer pick a mip level.
test("Tr2Mesh.UseWithScreenSize reports the resolved LOD's uv densities to every area material", () =>
{
  const reports = [];
  const requestedSizes = [];
  const MakeArea = name =>
  {
    const area = new Tr2MeshArea();
    area.effect = {
      UsedWithScreenSize: (screenSize, worldRadius, uvDensities) =>
        reports.push({ name, screenSize, worldRadius, uvDensities })
    };
    return area;
  };

  const mesh = new Tr2Mesh();
  mesh.meshIndex = 3;
  mesh.opaqueAreas.push(MakeArea("opaque"));
  mesh.decalAreas.push(MakeArea("decal"));
  mesh.geometry = {
    GetMeshLod(meshIndex, screenSize)
    {
      requestedSizes.push({ meshIndex, screenSize });
      return { uvDensities: [2, 4] };
    }
  };

  assert.equal(mesh.UseWithScreenSize(120, 7), true);
  assert.deepEqual(requestedSizes, [{ meshIndex: 3, screenSize: 120 }], "the LOD is resolved for the reported size");
  assert.equal(reports.length, 2, "every area material is told");
  assert.deepEqual(reports.map(entry => entry.name).sort(), ["decal", "opaque"]);
  assert.deepEqual(reports[0], { name: "opaque", screenSize: 120, worldRadius: 7, uvDensities: [2, 4] });
});

test("Tr2Mesh.UseWithScreenSize is inert without a geometry resource or a resolved LOD", () =>
{
  const mesh = new Tr2Mesh();
  assert.equal(mesh.UseWithScreenSize(120, 7), false, "no geometry resource");

  mesh.geometry = { GetMeshLod: () => null };
  assert.equal(mesh.UseWithScreenSize(120, 7), false, "no LOD resolved for the size");
});

test("Tr2Mesh.UseWithScreenSize survives areas with no material and reports an empty density list", () =>
{
  const seen = [];
  const mesh = new Tr2Mesh();
  const bare = new Tr2MeshArea();
  const live = new Tr2MeshArea();
  live.effect = { UsedWithScreenSize: (...args) => seen.push(args) };

  mesh.opaqueAreas.push(bare, live);
  // A resource whose LOD exposes no densities: Carbon passes the empty vector
  // through and the material requests the full resolution.
  mesh.geometry = { GetMeshLod: () => ({}) };

  assert.equal(mesh.UseWithScreenSize(50, 2), true);
  assert.deepEqual(seen, [[50, 2, []]], "only the area carrying a material is told");
});
