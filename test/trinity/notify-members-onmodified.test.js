import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { INotify } from "../../npm/dist/global/blue/INotify.js";
import { getClassRegistrations } from "../../npm/dist/global/blue/classes/registry.js";
import "../../npm/dist/trinity/index.js";
import "../../npm/dist/sof/index.js";
import "../../npm/dist/audio/index.js";
import "../../npm/dist/resource/index.js";

// A NOTIFY member calls OnModified when it changes. A class that declares one
// and inherits INotify's abstract OnModified throws "<Class>.OnModified must be
// implemented." the first time the member changes (EveChildInstanceContainer,
// EveEffectRoot2/EvePlanet and EveChildPlug all did, 2026-10-13).
test("every registered class with NOTIFY members implements OnModified", () =>
{
  const abstract = INotify.prototype.OnModified;
  const missing = [];
  for (const { type: Type } of getClassRegistrations())
  {
    if (typeof Type !== "function" || Type.prototype.OnModified !== abstract) continue;
    const schema = CjsSchema.getSchema(Type);
    const notify = (schema.members ?? []).filter(member => member.edit && member.edit.notify).map(member => member.name);
    if (notify.length) missing.push(`${CjsSchema.getClassName(Type)} (${notify.join(", ")})`);
  }
  assert.deepEqual(missing, []);
});
