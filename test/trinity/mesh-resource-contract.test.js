import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Mesh } from "../../npm/dist/trinity/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/TriGeometryRes.js";

test("mesh isLoading reads its fence even when resource loading disagrees", () =>
{
  const mesh = new Tr2Mesh();
  const geometry = new TriGeometryRes();
  geometry.MarkLoading();
  mesh.geometry = geometry;
  assert.equal(mesh.isLoading, false);
  mesh.geometry = null;
  mesh._loadFenceReached = false;
  assert.equal(mesh.isLoading, true, "Tr2Mesh.cpp:222-225");
});

test("mesh isLoading requires its native mapped getter", () =>
{
  const mesh = new Tr2Mesh();
  mesh.IsLoading = undefined;
  assert.throws(() => mesh.isLoading, TypeError, "Tr2Mesh_Blue.cpp:71-74");
});

test("geometry path follows low-detail selection and has no authored-path fallback", () =>
{
  const mesh = new Tr2Mesh();
  mesh.geometryResPath = "res:/authored.gr2";
  assert.equal(mesh.GetGeometryResPath(), "", "Tr2MeshBase.cpp:425-434");
  const primary = new TriGeometryRes();
  primary.Initialize("res:/primary.gr2");
  primary.MarkLoading();
  const low = new TriGeometryRes();
  low.Initialize("res:/low.gr2");
  mesh.geometry = primary;
  mesh.lowResGeometry = low;
  assert.equal(mesh.GetGeometryResPath(), "res:/low.gr2");
});

test("selected geometry path does not replace the resource getter result", () =>
{
  const mesh = new Tr2Mesh();
  mesh.geometryResPath = "res:/authored.gr2";
  mesh.geometry = new TriGeometryRes();
  mesh.geometry.GetPath = () => undefined;
  assert.equal(mesh.GetGeometryResPath(), undefined);
  mesh.geometry.GetPath = undefined;
  assert.throws(() => mesh.GetGeometryResPath(), TypeError);
});

