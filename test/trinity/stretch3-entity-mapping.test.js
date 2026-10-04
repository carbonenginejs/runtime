// EveStretch3's slot setters register a child only when its exposure table maps
// EveEntity (Carbon BlueCastPtr<EveEntity>, EveStretch3.cpp:222-299). The JS
// class chain is wider than the exposure table: EveChildQuad extends EveEntity
// in JS but does not map it, so it must not be registered.
import test from "node:test";
import assert from "node:assert/strict";
import { EveStretch3, EveChildQuad, EveChildContainer } from "../../npm/dist/trinity/index.js";

function Registry()
{
  return {
    Register(entity) { entity.registry = this; },
    UnRegister(entity) { entity.registry = null; },
    RegisterComponent() {},
    UnRegisterComponent() {}
  };
}

test("EveStretch3 registers mapped entities only", t =>
{
  const stretch = new EveStretch3();
  stretch.Register(Registry());
  const quad = new EveChildQuad(), container = new EveChildContainer();
  const quadRegister = t.mock.method(quad, "Register");
  const containerRegister = t.mock.method(container, "Register");
  stretch.SetSourceObject(quad);
  stretch.SetDestObject(container);
  assert.equal(quadRegister.mock.callCount(), 0, "EveChildQuad does not map EveEntity");
  assert.equal(containerRegister.mock.callCount(), 1, "EveChildContainer maps EveEntity");
});
