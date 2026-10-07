// Optional private-data proof. No game data ships in the package or tests.
import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlackFormat } from "../../../npm/dist/resource/formats/black/index.js";
import { EveSOF } from "../../../npm/dist/sof/index.js";
import * as CcpLog from "../../../npm/dist/global/logging/ccpLog.js";
import { clientResources } from "../../support/clientResources.js";

// The client's SOF data.black through BePaths; its bytes change per build, so none are pinned.
const sofData = await clientResources();

const DNA = "ab1_t1:lavatiger:amarr:mesh?orange_fire_polished;black_gunmetal_metallic;black_deadstar_matt;none:pattern?lavatiger_amarr;orange_burnt_mirror;black_gunmetal_metallic:respathinsert?base";
const MISSING = "rock_lightgray_sand";

test("real Apocalypse Lavacore DNA builds with an absent authored material", {
  skip: sofData.skip ?? false
}, async t =>
{
  const bytes = await sofData.Read("res:/dx9/model/spaceobjectfactory/data.black");
  const data = CjsBlackFormat.readPayload(bytes).object;
  const files = new Map([["res:/dx9/model/spaceobjectfactory/generic.black", data.generic]]);
  for (const [kind, directory] of Object.entries({hull: "hulls", faction: "factions", race: "races", material: "materials", pattern: "patterns", layout: "layouts"}))
  {
    for (const record of data[kind] ?? []) files.set(`res:/dx9/model/spaceobjectfactory/${directory}/${record.name}.black`, record);
  }
  const faction = data.faction.find(value => value.name === "lavatiger");
  assert.ok(JSON.stringify(faction).includes(MISSING), "real authored name must remain unchanged");
  const absentPath = `res:/dx9/model/spaceobjectfactory/materials/${MISSING}.black`;
  assert.equal(files.has(absentPath), false);
  assert.equal(files.has(absentPath.replace("lightgray", "lightgrey")), true);
  const reads = [];
  const messages = [];
  const echo = (channel, type, userData, message) => messages.push({type, message});
  CcpLog.RegisterLogEcho(echo);
  try
  {
    const sof = (await new EveSOF().Register({
      lazyData: {source: async path => {
        reads.push(path);
        if (!files.has(path)) throw new Error(`Resource file not found: ${path}`);
        return files.get(path);
      }},
      resources: {exists: async path => files.has(path)}
    }));
    const result = await sof.BuildFromDNAAsync(DNA);
    assert.equal(result._type, "EveShip2");
    assert.ok(result.mesh.opaqueAreas.length > 0, "the real hull emits mesh areas");
    assert.equal(sof.dataMgr.GetMaterialData(MISSING), null, "EveSOFDataMgr.cpp:273-281 silently returns nullptr");
    assert.equal(reads.includes(absentPath), false);
    assert.equal(reads.includes(absentPath.replace("lightgray", "lightgrey")), false, "never repair authored spelling");
    assert.equal(messages.filter(value => value.message.includes(MISSING)).length, 1, "our lazy-fetch warning is once per absent material");
    const warning = messages.find(value => value.message.includes(MISSING));
    assert.equal(warning.type, CcpLog.LogType.LOGTYPE_WARN);
    assert.ok(warning.message.includes("absent"));
    t.diagnostic("Apocalypse Lavacore built through EveSOF.BuildFromDNAAsync with the original absent material name");
  }
  finally { CcpLog.UnregisterLogEcho(echo); }
});
