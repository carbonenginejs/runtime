import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { EveSOF, EveSOFDNA } from "../../../npm/dist/sof/index.js";
import { EveSOFDataHullLightSetSpotLight } from "../../../npm/dist/sof/hull/EveSOFDataHullLightSetSpotLight.js";
import { CjsBlackFormat } from "../../../npm/dist/resource/formats/black/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { Tr2PointLight, Tr2TexturedPointLight, Tr2SpotLight } from "../../../npm/dist/trinity/index.js";
import { SofDocumentBuilder } from "../../../src/sof/SofDocumentBuilder.js";

function buildLights(rawHull)
{
  const sof = new EveSOF();
  sof.dataMgr.UpdateHull("fixture", rawHull);
  const hull = sof.dataMgr.GetHullData("fixture");
  const dna = new EveSOFDNA();
  dna.hullDatas = [ hull ];
  dna.factionData = {
    visibilityData: new Set(hull.hullLightSets.map(value => value.visibilityGroup)),
    colorData: { colors: Array.from({ length: 128 }, () => [ 1, 1, 1, 1 ]) }
  };
  const document = new SofDocumentBuilder();
  const owner = { lights: [] };
  sof.SetupLights(document, owner, dna);
  const nodes = owner.lights.map(value => document.GetNode(value.$ref));
  const live = nodes.map(node => CjsSchema.from(node.kind, { _type: node.kind, ...node.fields }));
  return { hull, nodes, live };
}

test("plain decoded hull-light identities retain point, textured point and spot behavior", () =>
{
  const items = [
    { _type: "EveSOFDataHullLightSetItem" },
    { _type: "EveSOFDataHullLightSetTexturedPointLight" },
    { _type: "EveSOFDataHullLightSetSpotLight", innerAngle: 10, outerAngle: 25 },
    { _type: "EveSOFDataHullLightSetSpotLight", type: 0 },
    new EveSOFDataHullLightSetSpotLight()
  ];
  const { hull, nodes, live } = buildLights({ lightSets: [ { items } ] });
  assert.deepEqual(hull.hullLightSets[0].items.map(value => value.type), [ 0, 1, 2, 0, 2 ],
    "EveSOFData.cpp:988-1020 constructors supply the type; an existing numeric projection remains authoritative");
  assert.deepEqual(nodes.map(node => node.kind), [ "Tr2PointLight", "Tr2TexturedPointLight", "Tr2SpotLight", "Tr2PointLight", "Tr2SpotLight" ]);
  assert.deepEqual(live.map(value => value.type), [ 1, 1, 2, 1, 2 ], "EveSOF.cpp:2809-2825 selects runtime light classes");
  assert.deepEqual([ nodes[2].fields.innerAngle, nodes[2].fields.outerAngle ], [ 10, 25 ]);
  assert.deepEqual([ live[2].innerAngle, live[2].outerAngle ], [ 10, 25 ]);
});

test("real cl1_t1 retains its eight SPOT and eight POINT lights through projection and hydration", {
  skip: !process.env.SOF_BLACK_CORPUS_FILE && "set SOF_BLACK_CORPUS_FILE to the indexed data.black copy"
}, async t =>
{
  const bytes = await readFile(process.env.SOF_BLACK_CORPUS_FILE);
  assert.equal(bytes.length, 184126948);
  assert.equal(createHash("md5").update(bytes).digest("hex"), "a800b64240ea16a7efba1d1b96df3365");
  const data = CjsBlackFormat.readPayload(bytes).object;
  const rawHull = data.hull.find(value => value.name === "cl1_t1");
  assert.ok(rawHull);
  const raw = rawHull.lightSets.flatMap(value => value.items);
  assert.equal(raw.filter(value => value._type === "EveSOFDataHullLightSetSpotLight").length, 8);
  assert.equal(raw.length, 16);
  const { hull, nodes, live } = buildLights(rawHull);
  const projected = hull.hullLightSets.flatMap(value => value.items);
  assert.equal(projected.filter(value => value.type === 2).length, 8, "EveSOFDataMgr.cpp:1006 retains each constructor-derived type");
  assert.equal(projected.filter(value => value.type === 0).length, 8);
  assert.equal(nodes.filter(value => value.kind === "Tr2SpotLight").length, 8);
  assert.equal(nodes.filter(value => value.kind === "Tr2PointLight").length, 8);
  assert.equal(live.filter(value => value.type === 2).length, 8);
  assert.equal(live.filter(value => value.type === 1).length, 8);
  for (let index = 0; index < raw.length; index += 1)
  {
    if (raw[index]._type === "EveSOFDataHullLightSetSpotLight")
    {
      assert.equal(CjsSchema.getClassName(live[index].constructor), "Tr2SpotLight");
      assert.equal(live[index].innerAngle, raw[index].innerAngle);
      assert.equal(live[index].outerAngle, raw[index].outerAngle);
    }
  }
  t.diagnostic("cl1_t1: 8 SPOT + 8 POINT, all authored cone angles retained");
});
