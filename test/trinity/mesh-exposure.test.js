import assert from "node:assert/strict";
import test from "node:test";
import { Tr2Mesh, Tr2MeshBase } from "../../npm/dist/trinity/index.js";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";

test("Tr2Mesh maps the path-clearing wrapper as SetGeometryRes", () =>
{
  // Carbon: Tr2Mesh_Blue.cpp:76-81 maps PySetGeometryRes, not the native setter.
  const methods = CjsSchema.getSchema(Tr2Mesh).methods;
  const exposed = methods.filter(method => method.exposure
    && (method.exposure.name ?? method.name) === "SetGeometryRes");
  assert.equal(exposed.length, 1);
  assert.equal(exposed[0].name, "PySetGeometryRes");
  assert.equal(exposed[0].exposure.macro, "MAP_METHOD_AND_WRAP");

  const mesh = new Tr2Mesh();
  mesh.geometryResPath = "res:/authored.gr2";
  mesh[exposed[0].name](null);
  assert.equal(mesh.geometryResPath, "", "Tr2Mesh.cpp:202-206 clears the authored path");
});

test("Tr2Mesh maps its inherited area query without exposing it on Tr2MeshBase", () =>
{
  // Carbon: Tr2Mesh_Blue.cpp:83-89; the Python wrapper returns the live native list.
  const row = CjsSchema.getMethod(Tr2Mesh, "GetAreas");
  assert.equal(row.exposure.macro, "MAP_METHOD");
  assert.equal(CjsSchema.getMethod(Tr2MeshBase, "GetAreas")?.exposure, undefined);
  assert.equal(Object.hasOwn(Tr2Mesh.prototype, "GetAreas"), false);
});
