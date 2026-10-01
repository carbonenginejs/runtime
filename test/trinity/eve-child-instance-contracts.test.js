import assert from "node:assert/strict";
import test from "node:test";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { EveEntity } from "../../npm/dist/trinity/eve/EveEntity.js";
import { EveChildContainer } from "../../npm/dist/trinity/eve/child/EveChildContainer.js";
import { EveChildInstanceContainer } from "../../npm/dist/trinity/eve/child/EveChildInstanceContainer.js";
import { EveChildMesh } from "../../npm/dist/trinity/eve/child/EveChildMesh.js";
import { EveChildTransform } from "../../npm/dist/trinity/eve/child/EveChildTransform.js";

test("instance containers expose their native EveEntity interface without mapping the shared transform base", () =>
{
  // EveChildInstanceContainer_Blue.cpp:21; native EveChildTransform has no entity exposure.
  const container = new EveChildInstanceContainer();
  const transform = new EveChildTransform();
  assert.equal(mappedInterfaces(container.constructor).has(EveEntity), true);
  assert.equal(mappedInterfaces(transform.constructor).has(EveEntity), false);
});

test("shader options reach the real source child when no instances exist", t =>
{
  const container = new EveChildInstanceContainer();
  const source = new EveChildContainer();
  container.source = source;
  const forwarded = t.mock.method(source, "SetShaderOption");

  container.SetShaderOption("Pattern", "Primary");

  assert.equal(container.instances.length, 0);
  assert.equal(forwarded.mock.callCount(), 1);
  assert.equal(forwarded.mock.calls[0].this, source);
  assert.deepEqual(forwarded.mock.calls[0].arguments, [ "Pattern", "Primary" ]);
});

test("disabling edit mode suppresses source fallback when no instances exist", t =>
{
  const container = new EveChildInstanceContainer();
  const source = new EveChildContainer();
  container.source = source;
  container.disableEditMode = true;
  const forwarded = t.mock.method(source, "SetShaderOption");

  container.SetShaderOption("Pattern", "Primary");

  assert.equal(forwarded.mock.callCount(), 0);
});

test("shader options reach each real instance in order without changing the source", t =>
{
  const container = new EveChildInstanceContainer();
  const source = new EveChildContainer();
  const first = new EveChildContainer();
  const second = new EveChildMesh();
  container.source = source;
  container.instances.push(first, second);
  // Disabling source edit mode must not disable already-created instances.
  container.disableEditMode = true;
  const sourceCalls = t.mock.method(source, "SetShaderOption");
  const calls = [];
  for (const instance of [ first, second ])
  {
    const original = instance.SetShaderOption;
    t.mock.method(instance, "SetShaderOption", function(name, value)
    {
      calls.push([ this, name, value ]);
      return original.call(this, name, value);
    });
  }

  container.SetShaderOption("MaterialUsage", "Turret");

  assert.deepEqual(calls, [
    [ first, "MaterialUsage", "Turret" ],
    [ second, "MaterialUsage", "Turret" ]
  ]);
  assert.equal(sourceCalls.mock.callCount(), 0);
});
