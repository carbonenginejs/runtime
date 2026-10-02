import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { ReadValues } from "../../npm/dist/global/blue/values.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { Tr2Light, Tr2PointLight, Tr2SpotLight, Tr2TexturedPointLight, Tr2FactionLight, IEveInheritPropertiesOwner } from "../../npm/dist/trinity/index.js";

test("real chain point light preserves flat storage and owned legacy value normalization", () =>
{
  const values = JSON.parse(readFileSync(new URL("../support/pointLightAsset.json", import.meta.url), "utf8")).object;
  const flat = CjsSchema.from(values._type, values);
  assert.equal(flat.radius, 6666);
  assert.deepEqual(Array.from(flat.color), values.color);
  const nested = CjsSchema.from("Tr2PointLight", { lightData: { radius: values.radius, color: values.color, brightness: values.brightness } });
  assert.equal(nested.radius, flat.radius);
  assert.deepEqual(Array.from(nested.color), Array.from(flat.color));
  assert.equal(nested.lightData.radius, flat.radius);
  assert.equal(Object.hasOwn(CjsSchema.getValues(nested), "lightData"), false);
  assert.equal("GetValues" in nested, false);
  assert.throws(() => ReadValues(new Tr2PointLight(), { lightData: { radius: values.radius } }), /Invalid attribute/,
    "negative control: bypassing the owned normalizer rejects the legacy shape");
  assert.deepEqual(mappedInterfaces(Tr2Light), new Set([Tr2Light]));
  for (const Type of [Tr2PointLight, Tr2SpotLight, Tr2TexturedPointLight])
    assert.deepEqual(mappedInterfaces(Type), new Set([Type, Tr2Light, IInitialize, INotify]));
  assert.deepEqual(mappedInterfaces(Tr2FactionLight), new Set([Tr2FactionLight, IEveInheritPropertiesOwner, Tr2Light, IInitialize, INotify]));
});
