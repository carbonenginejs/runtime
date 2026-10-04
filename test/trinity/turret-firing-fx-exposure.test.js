// EveTurretFiringFX asks its stretch elements Carbon's exposure-table questions (BlueCastPtr / QueryInterface,
// EveTurretFiringFX.cpp:216-226, 746-831), which read the Blue interface map - not the JavaScript class chain.
// See the decision page cjsmodel-composition-decorators ("Native exposure queries").
import assert from "node:assert/strict";
import test from "node:test";
import { EveChildQuad, EveComponentRegistry, EveStretch2, EveTurretFiringFX } from "../../npm/dist/trinity/index.js";

test("EveTurretFiringFX registers only elements whose exposure table maps EveEntity", () =>
{
  const fx = new EveTurretFiringFX();
  fx.display = true;
  fx.isFiring = true;
  // EveChildQuad inherits EveEntity in JavaScript, but its Blue exposure table does not map EveEntity.
  const quad = new EveChildQuad();
  const stretch = new EveStretch2();
  fx.stretch.push(stretch, quad);
  const registry = new EveComponentRegistry();
  fx.Register(registry);
  try
  {
    assert.equal(stretch.GetComponentRegistry(), registry, "EveStretch2 maps EveEntity, so it registers");
    assert.equal(quad.GetComponentRegistry(), null, "the JS ancestor chain alone does not make an EveEntity");
  }
  finally { registry.Clear(); }
});

test("EveTurretFiringFX forwards controller calls only to ITr2ControllerOwner elements", () =>
{
  const fx = new EveTurretFiringFX();
  const stretch = new EveStretch2();
  fx.stretch.push(stretch);
  // EveStretch2 is not an ITr2ControllerOwner (the pulse asset's case); it has no controller methods to call.
  assert.equal(stretch.SetControllerVariable, undefined);
  fx.SetControllerVariable("Power", 1);
  fx.HandleControllerEvent("Fire");
  fx.StartControllers();
});
