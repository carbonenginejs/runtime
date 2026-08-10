import { CjsWebglFormat } from "@carbonenginejs/runtime-resource/formats/webgl";
const url = "http://127.0.0.1:3000/ccp/latest/resources/graphics/effect.dx11/managed/space/spaceobject/fx/blinkinglightspool.sm_depth";
const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
const built = CjsWebglFormat.buildEffect(bytes, { source: url, localLights: "packed-texture" });
const read = CjsWebglFormat.read(built.bytes);
for (const stage of read.stages || [])
{
    const rec = (read.shaders || []).find(s => s.key === stage.shaderKey);
    if (!rec?.source) continue;
    console.log("=====", stage.stageName, stage.techniqueName, "pass", stage.passIndex, "=====");
    for (const b of stage.manifest?.bindings || [])
        console.log("  ", b.kind, "reg", b.registerIndex, b.name || b.metadataName || (b.carbon && b.carbon.name) || "");
    if (stage.stageName === "vertex")
    {
        console.log(rec.source.split("\n").filter(l => /^in |^out |uniform|gl_Position|attribute/.test(l.trim())).join("\n"));
    }
}
