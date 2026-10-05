import assert from "node:assert/strict";
import test from "node:test";
import { Tr2MeshBase, Tr2MeshArea, Tr2Effect } from "../../npm/dist/trinity/index.js";

test("mesh shader options use the area's native material getter", () =>
{
  const mesh = new Tr2MeshBase();
  const area = new Tr2MeshArea();
  const material = new Tr2Effect();
  const calls = [];
  material.SetOption = (name, value) => calls.push([name, value]);
  area.GetMaterialInterface = () => material;
  mesh.opaqueAreas.push(area);
  assert.equal(mesh.SetShaderOption("QUALITY", "HIGH"), true);
  assert.deepEqual(calls, [["QUALITY", "HIGH"]], "Tr2MeshBase.cpp:521-538");
});

for (const method of ["GetMaterialInterface", "SetOption"])
{
  test(`mesh shader options require ${method} on the installed receiver`, () =>
  {
    const mesh = new Tr2MeshBase();
    const area = new Tr2MeshArea();
    area.effect = new Tr2Effect();
    if (method === "SetOption") area.effect[method] = undefined;
    else area[method] = undefined;
    mesh.opaqueAreas.push(area);
    assert.throws(() => mesh.SetShaderOption("QUALITY", "HIGH"), TypeError);
  });
}

test("mesh shader options retain Carbon's null material guard", () =>
{
  const mesh = new Tr2MeshBase();
  mesh.opaqueAreas.push(new Tr2MeshArea());
  assert.equal(mesh.SetShaderOption("QUALITY", "HIGH"), false);
});

test("mesh batch adapter does not substitute its geometry getter result", () =>
{
  const mesh = new Tr2MeshBase();
  const area = new Tr2MeshArea();
  let observed = "not called";
  mesh.GetGeometryResource = () => undefined;
  mesh.CreateGeometryBatch = geometry => { observed = geometry; return null; };
  assert.equal(mesh.GetBatches(null, [area], null), false);
  assert.equal(observed, undefined);
});
