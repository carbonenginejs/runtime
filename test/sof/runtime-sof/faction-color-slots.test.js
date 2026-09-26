// Carbon indexes a faction colour set by the colour-type enum (EveSOF.cpp:
// 1103-1108 for spotlights, 1287 for planes), so a name's casing never
// mattered. The projection looks colours up by name; lower-casing only the
// requested name ("PrimarySpotlight" -> "primaryspotlight") missed the
// camelCase slot keys ("primarySpotlight"), and every multi-word type fell to
// the black default.
import assert from "node:assert/strict";
import { test } from "node:test";

import "../../../npm/dist/sof/index.js";
import { EveSOFDataMgr } from "../../../npm/dist/sof/index.js";

test("multi-word faction colour types resolve from camelCase slot keys", () =>
{
  const manager = new EveSOFDataMgr();
  manager.UpdateFaction("probe", {
    name: "probe",
    colorSet: {
      colors: {
        hull: [ 0.1, 0.2, 0.3, 1 ],
        primarySpotlight: [ 0.9, 0.8, 0.7, 1 ],
        primaryForcefield: [ 0.4, 0.5, 0.6, 1 ],
        primaryFX: [ 0.2, 0.4, 0.6, 1 ]
      }
    }
  });

  const colors = manager.GetFactionData("probe").colorData.colors.map(color => Array.from(color).map(Math.fround));
  const f = values => values.map(Math.fround);

  // The projection keeps the colour-type enum order (EveSOFData.h:177):
  // Hull is type 12, PrimarySpotlight type 36.
  assert.deepEqual(colors[12], f([ 0.1, 0.2, 0.3, 1 ]), "single-word type (unchanged)");
  assert.deepEqual(colors[36], f([ 0.9, 0.8, 0.7, 1 ]), "PrimarySpotlight (type 36) from primarySpotlight");
  assert.ok(colors.some(color => color[0] === Math.fround(0.4) && color[1] === Math.fround(0.5)), "PrimaryForcefield from primaryForcefield");
  assert.ok(colors.some(color => color[0] === Math.fround(0.2) && color[1] === Math.fround(0.4) && color[2] === Math.fround(0.6)), "an acronym-cased type (FX/Fx) from primaryFX");
});
