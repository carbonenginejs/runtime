// The optional proof reads an unmodified local copy; no game bytes are shipped.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { definitions } from "../../npm/dist/resource/formats/black/core/blackDefinitions.js";
import previous from "../../src/resource/formats/black/core/black-schema-v1-2026-09-25.json" with { type: "json" };

test("the dated postprocess snapshot contains Carbon's 56 persisted attribute pairs", () =>
{
  const fields = definitions.classes.Tr2PostProcessAttributes;
  assert.equal(Object.keys(fields).length, 113, "Tr2PostProcessAttributes_Blue.cpp:41-117: 56 pairs plus priority");
  for (const name of Object.keys(fields).filter(name => name.endsWith("Enabled")))
  {
    assert.equal(fields[name], "boolean");
    assert.ok(Object.hasOwn(fields, name.slice(0, -7)));
  }
  assert.equal(Object.hasOwn(fields, "intensity"), false, "Carbon exposes intensity without PERSIST");
  assert.equal(Object.hasOwn(fields, "depthOfFieldForegroundBlurNeeded"), false, "native storage without Blue exposure is not a wire field");
});

test("real Amarr home environment volume decodes its authored color correction pairs", {
  skip: !process.env.POSTPROCESS_BLACK_CORPUS_FILE && "set POSTPROCESS_BLACK_CORPUS_FILE for the real volume proof"
}, async () =>
{
  const bytes = await readFile(process.env.POSTPROCESS_BLACK_CORPUS_FILE);
  assert.equal(bytes.length, 471);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "ca85b3205a72c8335705821de7cc9e2c772dd1cc7fef412cabd916e5b53abe11");
  assert.throws(() => CjsBlackFormat.readPayload(bytes, { schema: previous }), /Unknown Black property whiteTemperatureEnabled/, "the previous snapshot reproduces the failure on the same bytes");
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
