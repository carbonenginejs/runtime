// The optional proof reads an unmodified local copy; no game bytes are shipped.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2PostProcessAttributes } from "../../npm/dist/trinity/index.js";

test("Tr2PostProcessAttributes persists Carbon's 56 attribute pairs", () =>
{
  const persisted = new Map(CjsSchema.getSchema(Tr2PostProcessAttributes).members
    .filter(member => member.edit?.persist)
    .map(member => [ member.name, member ]));
  assert.equal(persisted.size, 113, "Tr2PostProcessAttributes_Blue.cpp:41-117: 56 pairs plus priority");
  for (const name of [ ...persisted.keys() ].filter(name => name.endsWith("Enabled")))
  {
    assert.equal(persisted.get(name).type.kind, "boolean");
    assert.ok(persisted.has(name.slice(0, -7)));
  }
  assert.equal(persisted.has("intensity"), false, "Carbon exposes intensity without PERSIST");
  assert.equal(persisted.has("depthOfFieldForegroundBlurNeeded"), false, "native storage without Blue exposure is not a wire field");
});

test("real Amarr home environment volume decodes its authored color correction pairs", {
  skip: !process.env.POSTPROCESS_BLACK_CORPUS_FILE && "set POSTPROCESS_BLACK_CORPUS_FILE for the real volume proof"
}, async () =>
{
  const bytes = await readFile(process.env.POSTPROCESS_BLACK_CORPUS_FILE);
  assert.equal(bytes.length, 471);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "ca85b3205a72c8335705821de7cc9e2c772dd1cc7fef412cabd916e5b53abe11");
  const root = CjsBlackFormat.readPayload(bytes).object;
  assert.equal(root._type, "EveEffectRoot2");
  assert.equal(root.name, "EnvVol_Amarr_Home_01a");
  const attributes = root.effectChildren[0].objects[0].postProcessAttributes;
  assert.equal(attributes._type, "Tr2PostProcessAttributes");
  assert.equal(attributes.priority, 1);
  for (const name of ["whiteTemperature", "whiteTint", "colorSaturation", "colorContrast", "colorGain"])
  {
    assert.equal(attributes[name + "Enabled"], true, name);
  }
  assert.equal(attributes.whiteTemperature, 7500);
  assert.equal(attributes.whiteTint, 0.25);
  assert.equal(attributes.colorSaturation, Math.fround(0.9));
  assert.equal(attributes.colorContrast, Math.fround(1.05));
  assert.deepEqual(attributes.colorGain, [1.15, 1.15, 0.7].map(Math.fround));
});
