// Tr2TexturePipeline.ExecuteFromScript (trinity/trinity/Resources/TexturePipeline/Tr2TexturePipeline.cpp:57-90):
// loads every dependency with Tr2HostBitmap.CreateFromFile, runs the pipeline and returns the bitmap.
import assert from "node:assert/strict";
import { test } from "node:test";
// ExecuteFromScript makes its bitmaps through Blue's class registry (Carbon's CreateInstance), so the class must be defined.
import { Tr2HostBitmap } from "../../../npm/dist/trinity/core/Tr2HostBitmap.js";
import { Tr2TexturePipeline, Tr2TexturePipelineStepLoad, Tr2TexturePipelineStepLimitSize } from "../../../npm/dist/resource/index.js";
import { CjsBmpFormat } from "../../../npm/dist/resource/formats/bmp/index.js";
import { ImageIO } from "../../../npm/dist/resource/imageio/index.js";
import { BlueResFileSystemForm, CjsBluePaths, IBlueResFileSystem } from "../../../npm/dist/global/blue/index.js";
import { installBlueServices } from "../../../npm/dist/global/blue/blue.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";

/** A 32-bit BMP: pixel (x, y) is b = 10 + x, g = 20 + y, r = 30, a = 200 (top-left origin). */
function bmp(width, height)
{
  const stride = width * 4;
  const start = 54;
  const bytes = new Uint8Array(start + stride * height);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0x4d42, true);
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, start, true);
  view.setUint32(14, 40, true);
  view.setUint32(18, width, true);
  view.setUint32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(34, stride * height, true);

  for (let y = 0; y < height; y++)
  {
    for (let x = 0; x < width; x++)
    {
      bytes.set([ 10 + x, 20 + y, 30, 200 ], start + (height - 1 - y) * stride + x * 4);
    }
  }

  return bytes;
}

/** A res file system answering from a map of path to bytes. */
function memoryFileSystem(files)
{
  const FileSystem = class extends IBlueResFileSystem
  {
    static protocols = [ "res" ];
    static forms = [ BlueResFileSystemForm.BYTES ];
    FileExists(path) { return files.has(path); }
    IsDirectory() { return false; }
    GetDirectoryContents() {}
    ResolvePathW(path) { return files.has(path) ? path : null; }
    async GetStreamFromPath(path, request)
    {
      return files.has(path) ? { form: request.form, data: files.get(path) } : null;
    }
  };

  return new FileSystem();
}

/** Installs a paths service over `files` for the test and restores the previous services after it. */
function withFiles(t, files)
{
  const paths = new CjsBluePaths();
  paths.RegisterFileSystem(memoryFileSystem(files));
  const previous = installBlueServices({ paths }, false);
  ImageIO.registerImageHandler(CjsBmpFormat);
  t.after(() => installBlueServices(previous, previous.running));
}

test("ExecuteFromScript loads each dependency, runs the pipeline and returns the bitmap (cpp:57-90)", async t =>
{
  withFiles(t, new Map([ [ "res:/a.bmp", bmp(4, 4) ] ]));
  const load = new Tr2TexturePipelineStepLoad();
  load.path = "res:/a.bmp";
  const pipeline = new Tr2TexturePipeline();
  pipeline.steps = [ load ];

  const result = await pipeline.ExecuteFromScript();
  assert.ok(result instanceof Tr2HostBitmap);
  assert.deepEqual([ result.width, result.height ], [ 4, 4 ]);
  assert.deepEqual([ ...result.GetRawData(3, 3).subarray(0, 4) ], [ 13, 23, 30, 200 ]);

  const limited = await pipeline.ExecuteFromScript(2, 2);
  assert.deepEqual([ limited.width, limited.height ], [ 2, 2 ], "the size limit is applied after the steps");

  load.path = "res:/missing.bmp";
  await assert.rejects(pipeline.ExecuteFromScript(), /failed to load texture res:\/missing\.bmp/u);

  const empty = new Tr2TexturePipeline();
  await assert.rejects(empty.ExecuteFromScript(), /error executing pipeline/u, "no steps");

  const limit = new Tr2TexturePipelineStepLimitSize();
  limit.maxWidth = 1;
  load.path = "res:/a.bmp";
  pipeline.steps = [ load, limit ];
  assert.equal((await pipeline.ExecuteFromScript()).width, 1);

  const row = CjsSchema.getMethod(Tr2TexturePipeline, "ExecuteFromScript");
  assert.equal(row.exposure.macro, "MAP_METHOD_AND_WRAP_OPTIONAL_ARGS");
  assert.equal(row.exposure.name, "Execute");
  assert.equal(row.impl.status, "adapted");
});

test("ExecuteFromScript reports Carbon's out-of-memory result when Tr2HostBitmap cannot be created (cpp:68)", async () =>
{
  const { blue } = await import("../../../npm/dist/global/blue/blue.js");
  const original = blue.classes.CreateInstance;
  blue.classes.CreateInstance = () => null;

  try
  {
    const load = new Tr2TexturePipelineStepLoad();
    load.path = "res:/a.bmp";
    const pipeline = new Tr2TexturePipeline();
    pipeline.steps = [ load ];
    await assert.rejects(pipeline.ExecuteFromScript(), /^Error: out of memory$/u);
  }
  finally
  {
    blue.classes.CreateInstance = original;
  }
});
