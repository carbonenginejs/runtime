import { IRoot as ExposureRoot } from "../../npm/dist/global/blue/IRoot.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { ReadValues } from "../../npm/dist/global/blue/values.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { Tr2Light, Tr2PointLight, Tr2SpotLight, Tr2TexturedPointLight, Tr2FactionLight, IEveInheritPropertiesOwner } from "../../npm/dist/trinity/index.js";

test("real chain point light reads into its embedded LightData and carries no values methods", () =>
{
  const values = JSON.parse(readFileSync(new URL("../support/pointLightAsset.json", import.meta.url), "utf8")).object;
  const flat = CjsSchema.from(values._type, values);
  assert.equal(flat.radius, 6666);
  assert.deepEqual(Array.from(flat.color), values.color);
  assert.equal(flat.GetLightData().radius, flat.radius);
  assert.equal(Object.hasOwn(CjsSchema.getValues(flat), "lightData"), false);
  assert.equal("GetValues" in flat, false);
  assert.equal("SetValues" in flat, false, "Carbon classes carry no values methods of ours (operator, 2026-10-17)");
  // lightData is not a Blue member, so the pre-flatten nested shape is rejected
  // on every values route now that no class-owned normalizer folds it.
  assert.throws(() => CjsSchema.from("Tr2PointLight", { lightData: { radius: values.radius } }), /Invalid attribute/);
  assert.throws(() => ReadValues(new Tr2PointLight(), { lightData: { radius: values.radius } }), /Invalid attribute/);
  assert.deepEqual(mappedInterfaces(Tr2Light), new Set([ExposureRoot, Tr2Light]));
  for (const Type of [Tr2PointLight, Tr2SpotLight, Tr2TexturedPointLight])
    assert.deepEqual(mappedInterfaces(Type), new Set([ExposureRoot, Type, Tr2Light, IInitialize, INotify]));
  assert.deepEqual(mappedInterfaces(Tr2FactionLight), new Set([ExposureRoot, Tr2FactionLight, IEveInheritPropertiesOwner, Tr2Light, IInitialize, INotify]));
});
