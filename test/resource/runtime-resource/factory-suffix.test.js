import assert from "node:assert/strict";
import test from "node:test";
import { CjsBlueResMan, IBlueResource, ICacheable } from "../../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { TriTextureRes, Tr2ImageRes } from "../../../npm/dist/resource/texture/index.js";
import { Tr2LightProfileRes } from "../../../npm/dist/resource/index.js";
import { DefaultConfiguration } from "../../../npm/dist/core/configuration.js";

function profileBytes(width = 1024)
{
  // Synthetic legacy DDS: D3DFMT_R16F = 111, a complete one-row mip chain.
  const mipCount = Math.log2(width) + 1;
  const bytes = new Uint8Array(128 + (width * 2 - 1) * 2);
  const header = new DataView(bytes.buffer);
  for (const [offset, value] of [[0,0x20534444],[4,124],[8,0x21007],[12,1],[16,width],
    [28,mipCount],[76,32],[80,4],[84,111],[108,0x401008]]) header.setUint32(offset,value,true);
  return bytes;
}

function managerWithSource(bytes)
{
  const paths = [];
  const manager = new CjsBlueResMan({ source: { Read(path) { paths.push(path); return bytes; } } });
  manager.Register(DefaultConfiguration);
  return { manager, paths };
}

test("extension plus ex selects the factory without changing the source file", async () =>
{
  const { manager, paths } = managerWithSource(profileBytes());
  const path = "res:/texture/fx/profile.dds";
  const texture = manager.GetResource(path);
  const raw = manager.GetResource(path, { ex: "raw" });
  const light = manager.GetResource(path, { ex: "lp" });
  assert.ok(CjsSchema.cast(texture, TriTextureRes));
  assert.ok(CjsSchema.cast(raw, Tr2ImageRes));
  assert.ok(CjsSchema.cast(light, Tr2LightProfileRes));
  await Promise.all([ texture.Ready(), raw.Ready(), light.Ready() ]);
  assert.ok(paths.length);
  assert.ok(paths.every(value => value === path));
  assert.equal(light.GetExt(), "lp");
  assert.equal(light.GetBitmap().GetWidth(), 1024);
  assert.equal(light.GetBitmap().GetTrueMipCount(), 11);
  assert.equal(manager.GetResource(path, { ex: "lp" }), light);
  assert.equal(manager.Lookup(path, { ex: "raw" }), raw);
  assert.notEqual(texture, raw);
  assert.notEqual(raw, light);
});

test("iid validates the cached resource without selecting a replacement", async () =>
{
  const { manager } = managerWithSource(profileBytes());
  const path = "res:/profile.dds";
  const raw = manager.GetResource(path, { ex: "raw", iid: IBlueResource });
  await raw.Ready();
  assert.equal(manager.GetResource(path, { ex: "raw", iid: TriTextureRes }), null);
  assert.equal(manager.GetResource(path, { ex: "raw", iid: ICacheable }), raw);
  assert.equal(manager.GetResource(path, { ex: "raw", iid: Tr2ImageRes }), raw);
});

test("unregistered suffix fails without reading or adding a generic resource", async () =>
{
  const { manager, paths } = managerWithSource(profileBytes());
  assert.equal(manager.GetResource("res:/profile.dds", { ex: "missing" }), null);
  assert.equal(manager.Lookup("res:/profile.dds", { ex: "missing" }), null);
  assert.deepEqual(paths, []);
  await assert.rejects(manager.FetchResource("res:/profile.dds", { ex: "missing" }), /No resource factory/);
});

test("factory lookup folds case but suffix and query remain part of identity", async () =>
{
  const { manager } = managerWithSource(profileBytes());
  const lower = manager.GetResource("res:/profile.dds?sample=1", { ex: "lp" });
  const upper = manager.GetResource("res:/profile.dds?sample=1", { ex: "LP" });
  const query = manager.GetResource("res:/profile.dds?sample=2", { ex: "lp" });
  assert.notEqual(lower, upper);
  assert.notEqual(lower, query);
  assert.equal(upper.GetExt(), "LP");
  await Promise.all([ lower.Ready(), upper.Ready(), query.Ready() ]);
});

test("light-profile resource refuses a DDS with incompatible dimensions", async () =>
{
  const { manager } = managerWithSource(profileBytes(512));
  await assert.rejects(manager.FetchResource("res:/wrong.dds", { ex: "lp" }), /1024x1 R16F/);
});

test("ieslp uses the configured photometry reader and publishes a complete profile", async () =>
{
  const bytes = new TextEncoder().encode(
    "IESNA:LM-63-1995\nTILT=NONE\n1 100 1 2 1 1 1 0 0 0 1 0 60\n0 180\n0\n500 0\n"
  );
  const { manager, paths } = managerWithSource(bytes);
  const light = await manager.FetchResource("res:/test.ies", { ex: "lp" });
  assert.equal(light.GetBitmap().GetTrueMipCount(), 11);
  assert.equal(light.GetBitmap().GetWidth(), 1024);
  assert.deepEqual(paths, [ "res:/test.ies" ]);
});

test("a suffixed handle keeps its identity when Ready requests another suffix", async () =>
{
  const { manager } = managerWithSource(profileBytes());
  const raw = manager.GetResource("res:/profile.dds", { ex: "raw" });
  await raw.Ready({ ex: "lp" });
  assert.equal(raw.GetExt(), "raw");
  assert.ok(CjsSchema.cast(raw, Tr2ImageRes));
  assert.equal(manager.Lookup("res:/profile.dds", { ex: "lp" }), null);
});

test("the omitted suffix is pinned through readiness and reconstruction", async () =>
{
  const { manager } = managerWithSource(profileBytes());
  const texture = manager.GetResource("res:/profile.dds");
  await texture.Ready({ ex: "raw" });
  assert.equal(texture.IsPrepared(), true);
  assert.equal(texture.GetExt(), "");
  assert.equal(manager.Lookup("res:/profile.dds", { ex: "raw" }), null);
  texture.ReleasePayload();
  await texture.Ready();
  assert.equal(texture.IsPrepared(), true);
  assert.equal(manager.Lookup("res:/profile.dds"), texture);
});
