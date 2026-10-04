// The froxel fog's compute effects translate to WGSL from the shipped dx11 .sm_depth (real client files through
// clientResources). Each case pins one translator capability the fog needs.
import { test } from "node:test";
import assert from "node:assert/strict";
import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";
import { clientResources } from "../../../../support/clientResources.js";

const client = await clientResources();
const skip = client.skip ?? false;
const FOG = "res:/graphics/effect.dx11/managed/space/specialfx/volumetric/fog/";

async function build(name, permutation = [])
{
  const path = `${FOG}${name}.sm_depth`;
  return CjsWebgpuFormat.buildEffect(await client.Read(path), { source: path, permutation });
}

test("RaymarchFroxels with a temporal input loads its 3D froxels: ld on a Texture3D becomes a bounds-checked textureLoad", { skip }, async () =>
{
  // The scene view's set reads the temporally filtered froxels (Tr2VolumetricsRenderer.cpp:21-45).
  const result = await build("raymarchfroxels", [ { name: "INPUT_SOURCE", value: "INPUT_SOURCE_INPUT_TEXTURE" } ]);
  assert.equal(result.qualification.packageValid, true);
  const wgsl = JSON.stringify(result.wgsl);
  assert.match(wgsl, /texture_3d<f32>/u, "the input is a 3D texture");
  // D3D11 ld reads 0 out of bounds: the clamped xyz load at the clamped mip, selected by the bounds test.
  assert.match(wgsl, /select\(vec4<f32>\(\), textureLoad\(t0, min\(vec4<u32>\([^)]*\)\.xyz, textureDimensions\(t0, /u);
  assert.match(wgsl, /\.w < textureNumLevels\(t0\) && all\(vec4<u32>\([^)]*\)\.xyz < textureDimensions\(t0, /u);
});

test("RaymarchFroxels without a temporal input reads back its own output UAV, which core WebGPU cannot store read-write", { skip }, async () =>
{
  // The reflection map's set raymarches its output texture in place; read-write storage of a four-channel float
  // format is not available on core WebGPU, so this permutation is refused, not mistranslated.
  await assert.rejects(build("raymarchfroxels", [ { name: "INPUT_SOURCE", value: "INPUT_SOURCE_OUTPUT_TEXTURE" } ]),
    /ld_uav_typed instruction \d+ requires a read-write/u);
});

test("FilterFroxels samples its 3D neighbours with immediate offsets: u, v and w become a vec3<i32> offset", { skip }, async () =>
{
  const result = await build("filterfroxels");
  assert.equal(result.qualification.packageValid, true);
  const code = result.wgsl.shaders[0].code;
  // The six face neighbours, the z pair included, which a 2D offset would drop.
  for (const offset of [ "-1, 0, 0", "1, 0, 0", "0, -1, 0", "0, 1, 0", "0, 0, -1", "0, 0, 1" ])
  {
    assert.ok(code.includes(`, vec3<i32>(${offset}));`), `offset (${offset})`);
  }
});

