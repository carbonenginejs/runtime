import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, IInitialize, INotify, ICopierCustomAssignment } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { TriTextureParameter, Tr2Matrix4Parameter, Tr2Vector4Parameter, Tr2TextureReference } from "../../npm/dist/trinity/index.js";

const host = JSON.parse(readFileSync(new URL("../support/crisisParticleHost.json", import.meta.url), "utf8"));
const records = [];
function collect(value)
{
  if (!value || typeof value !== "object") return;
  if (value._type === "TriTextureParameter" || value._type === "Tr2Vector4Parameter") records.push(value);
  for (const child of Object.values(value)) collect(child);
}
collect(host);

test("real Crisis shader records hydrate and retain detached storage without the parameter model base", () =>
{
  assert.equal(records.length, 4);
  for (const values of records)
  {
    const parameter = CjsSchema.from(values._type, structuredClone(values));
    assert.equal(CjsSchema.getClassName(parameter.constructor), values._type);
    assert.equal(parameter.GetParameterName(), values.name);
    assert.equal("SetValues" in parameter, false);
    if (values.value)
    {
      assert.deepEqual(Array.from(parameter.value), values.value);
      assert.notEqual(parameter.value, values.value);
    }
    else assert.equal(parameter.resourcePath, values.resourcePath);
  }
  assert.equal(mappedInterfaces(Tr2Vector4Parameter).has(IInitialize), true);
  assert.equal(mappedInterfaces(Tr2Matrix4Parameter).has(IInitialize), false,
    "Negative control: a same-named method does not grant a native initialization interface");
  assert.equal(mappedInterfaces(TriTextureParameter).has(INotify), true);
  assert.equal(mappedInterfaces(TriTextureParameter).has(ICopierCustomAssignment), true);
});

test("real authored texture assignment only forwards providers for dynamic resources", () =>
{
  const values = records.find(value => value._type === "TriTextureParameter");
  const parameter = new DictReader({ declarations: true, initialize: false }).CreateObject(values);
  const provider = new Tr2TextureReference();
  parameter.SetResource(provider);
  const authored = new TriTextureParameter();
  CjsSchema.cast(parameter, ICopierCustomAssignment).AssignTo(authored, null);
  assert.notEqual(authored.resource, provider,
    "Negative control: a persisted resource path must not copy a runtime provider");
  parameter.resourcePath = "";
  const dynamic = new TriTextureParameter();
  CjsSchema.cast(parameter, ICopierCustomAssignment).AssignTo(dynamic, null);
  assert.equal(dynamic.resource, provider);
  assert.equal(parameter.name, values.name);
});
