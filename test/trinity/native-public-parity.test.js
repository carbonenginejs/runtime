import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, mkdir, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

test("parity audit distinguishes native obligations from Blue exposure", async () =>
{
  const schema = await mkdtemp(join(tmpdir(), "cjs-native-parity-"));
  try
  {
    await mkdir(join(schema,"trinityCore"));
    await writeFile(join(schema,"trinityCore","Tr2GpuBuffer.json"), JSON.stringify({
      blueClass:"Tr2GpuBuffer", family:"trinityCore",
      methods:[{blueName:"OnModified",target:"OnModified",macro:"MAP_METHOD"}],
      nativeMethods:[{cppName:"OnModified"},{cppName:"Initialize"},{cppName:"MissingRegressionMethod"}]
    }));
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("../../scripts/trinity/audit_public_method_parity.js", import.meta.url)),
      "--schema-root", schema, "--json"
    ], {encoding:"utf8",windowsHide:true,maxBuffer:8*1024*1024});
    const output = result.stdout;
    const report = JSON.parse(output.slice(0,output.indexOf("\n}\n")+2));
    const rows = [...report.omissions,...report.unexposed].filter(row=>row.className === "Tr2GpuBuffer");
    assert.equal(rows.some(row=>row.method === "Initialize"), false, "implemented native-only callback needs no Blue exposure decorator");
    assert.ok(report.unexposed.some(row=>row.className === "Tr2GpuBuffer" && row.method === "OnModified"), "an explicit Blue declaration still requires exposure");
    assert.ok(report.omissions.some(row=>row.className === "Tr2GpuBuffer" && row.method === "MissingRegressionMethod"), "missing native obligations still fail");
    assert.equal(result.status, 1);
  }
  finally { await rm(schema,{recursive:true,force:true}); }
});
