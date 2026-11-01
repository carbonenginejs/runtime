import "../../npm/dist/blue/blue/values.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { CjsPngFormat } from "../../npm/dist/resource/formats/png/index.js";
import { Tr2HostBitmap } from "../../npm/dist/trinity/core/Tr2HostBitmap.js";

test("maintained Trinity host bitmap shares native storage with a decoded PNG", async () =>
{
  const rgba = Uint8Array.from({ length: 16 * 8 * 4 }, (_, i) => (i * 37 + 11) & 255);
  const bytes = await CjsPngFormat.writeAsync({ width: 16, height: 8, data: rgba });
  const decoded = new HostBitmap();
  await CjsPngFormat.readImageNativeAsync(bytes, {}, decoded);
  assert.ok(decoded.GetWidth() > 0);
  assert.ok(decoded.GetHeight() > 0);
  const expected = [decoded.GetWidth(), decoded.GetHeight(), decoded.GetRawDataSize()];
  const bitmap = new Tr2HostBitmap();
  bitmap.Swap(decoded);
  assert.ok(bitmap instanceof HostBitmap);
  assert.deepEqual([bitmap.width, bitmap.height, bitmap.GetRawDataSize()], expected);
  const values = CjsSchema.getValues(bitmap);
  assert.equal(values.width, bitmap.GetWidth());
  assert.equal(values.height, bitmap.GetHeight());
  assert.equal(values.format, bitmap.GetFormat());
  CjsSchema.setValues(bitmap, { name: "decoded-png" });
  assert.equal(bitmap._name, "decoded-png");
  assert.equal(bitmap.name, "decoded-png");
  assert.equal("SetValues" in bitmap, false);
  const control = new Tr2HostBitmap();
  Object.defineProperty(control, "width", { value: 0 });
  control.Swap(bitmap);
  assert.notEqual(control.width, control.GetWidth(),
    "negative control: the old independent width snapshot diverges from native storage");
  assert.equal(existsSync(new URL("../../src/trinity/generated/trinityCore/Tr2HostBitmap.js", import.meta.url)), false);
  const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.exports["./trinity/generated/trinityCore/Tr2HostBitmap.js"], null);
  assert.throws(() => control.SaveAsync(), /not implemented/);
});
