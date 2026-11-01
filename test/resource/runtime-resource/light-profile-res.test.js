// Tr2LightProfileRes: ParseIes, BakeLightProfile, GetThumbnail, DoPrepare
// (trinity/trinity/Resources/Tr2LightProfileRes.cpp:95-354). Expected values are computed from the
// Carbon source arithmetic written out in this file, not from our implementation.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Tr2LightProfileRes } from "../../../npm/dist/resource/index.js";
import { HostBitmap } from "../../../npm/dist/global/imageio/index.js";
import { BlueResFileSystemForm, BluePaths, IBlueResFileSystem } from "../../../npm/dist/blue/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue/blue.js";
import { PixelFormat } from "../../../npm/dist/global/consts/renderContext/index.js";
import { num } from "../../../npm/dist/global/math/num.js";

// 5 vertical angles, one horizontal angle, TILT=NONE. Header fields: lamps, lumens, multiplier,
// vertical count, horizontal count, photometric type, units, width, length, height, ballast, future, watts.
const ANGLES = [ 0, 22.5, 45, 67.5, 90 ];
const CANDELA = [ 1000, 800, 400, 100, 0 ];
const IES = [
  "IESNA:LM-63-2002",
  "[TEST] light profile",
  "TILT=NONE",
  "1 1000 1 5 1 1 2 0 0 0 1 1 100",
  ANGLES.join(" "),
  "0",
  CANDELA.join(" ")
].join("\n");

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

function withFiles(t, files)
{
  const paths = new BluePaths();
  paths.RegisterFileSystem(memoryFileSystem(files));
  const previous = installBlueServices({ paths }, false);
  t.after(() => installBlueServices(previous, previous.running));
}

/** Reads texel `index` of mip 0 as a float. */
function texel(bitmap, index)
{
  const bytes = bitmap.GetRawData();
  return num.fromHalfFloat(bytes[index * 2] | (bytes[index * 2 + 1] << 8));
}

/** Tr2LightProfileRes.cpp:180-196: the strip the IES text must bake to, in plain arithmetic. */
function expectedStrip()
{
  const intensities = CANDELA.map(c => c / Math.max(...CANDELA));
  const strip = [];

  for (let i = 0; i < 1024; ++i)
  {
    const angle = Math.acos(-i / 1024 * 2 + 1) / Math.PI * 180;
    let intensity = 0;

    for (let j = 0; j + 1 < ANGLES.length; ++j)
    {
      if (angle >= ANGLES[j] && angle <= ANGLES[j + 1])
      {
        const t = (angle - ANGLES[j]) / (ANGLES[j + 1] - ANGLES[j]);
        intensity = intensities[j] + t * (intensities[j + 1] - intensities[j]);
        break;
      }
    }

    strip.push(intensity);
  }

  return strip;
}

test("ParseIes bakes the strip into a bitmap Carbon would accept as a light profile", () =>
{
  const bitmap = new HostBitmap();

  assert.strictEqual(Tr2LightProfileRes._ParseIes__ContentsBitmap(IES, bitmap), true);
  assert.strictEqual(bitmap.GetWidth(), 1024);
  assert.strictEqual(bitmap.GetHeight(), 1);
  assert.strictEqual(bitmap.GetFormat(), PixelFormat.PIXEL_FORMAT_R16_FLOAT);
  assert.strictEqual(bitmap.GetTrueMipCount(), 11);

  const strip = expectedStrip();
  for (const i of [ 0, 1, 100, 255, 512, 700, 1000, 1023 ])
  {
    assert.ok(Math.abs(texel(bitmap, i) - strip[i]) < 1e-3, `texel ${i}: ${texel(bitmap, i)} vs ${strip[i]}`);
  }

  // Mip 1 is the half-quantised box filter of mip 0 (cpp:204-215).
  const mip1 = bitmap.GetMipRawData(1);
  const second = num.fromHalfFloat(mip1[0] | (mip1[1] << 8));
  assert.ok(Math.abs(second - (strip[0] + strip[1]) * 0.5) < 1e-3);
});

test("ParseIes answers false unless the TILT line is NONE (cpp:115-130)", () =>
{
  const bitmap = new HostBitmap();

  assert.strictEqual(Tr2LightProfileRes._ParseIes__ContentsBitmap(IES.replace("TILT=NONE", "TILT=INCLUDE"), bitmap), false);
  assert.strictEqual(Tr2LightProfileRes._ParseIes__ContentsBitmap("no tilt here\n1 2 3", bitmap), false);
  assert.strictEqual(bitmap.IsValid(), false);
});

test("ParseIes() fills the resource's own bitmap", () =>
{
  const resource = new Tr2LightProfileRes();

  assert.strictEqual(resource._ParseIes(IES), true);
  assert.strictEqual(resource.GetBitmap().GetWidth(), 1024);
});

test("DoPrepare answers true; the array slice is acquired by trinity", () =>
{
  const resource = new Tr2LightProfileRes();

  assert.strictEqual(resource._DoPrepare(), true);
  assert.strictEqual(resource.GetTextureIndex(), -1);
});

test("BakeLightProfile reads an .ies path and returns the bitmap (cpp:219-247)", async t =>
{
  withFiles(t, new Map([
    [ "res:/light/test.ies", new TextEncoder().encode(IES) ],
    [ "res:/light/broken.ies", new TextEncoder().encode("TILT=INCLUDE\n") ]
  ]));

  const bitmap = await Tr2LightProfileRes.BakeLightProfile("res:/light/test.ies");
  assert.strictEqual(bitmap.GetTrueMipCount(), 11);
  assert.ok(Math.abs(texel(bitmap, 512) - expectedStrip()[512]) < 1e-3);

  // Extension test is case-insensitive (cpp:33-44).
  await assert.doesNotReject(Tr2LightProfileRes.BakeLightProfile("res:/light/test.ies".replace(".ies", ".IeS")).catch(error =>
  {
    // Only the missing upper-case file may fail, as IO_ERROR - never the extension check.
    assert.strictEqual(error.code, "BLUE_STD_RESULT_IO_ERROR");
  }));

  await assert.rejects(Tr2LightProfileRes.BakeLightProfile("res:/light/test.dds"), { code: "BLUE_STD_RESULT_VALUE_ERROR", message: "This function expects an .ies path" });
  await assert.rejects(Tr2LightProfileRes.BakeLightProfile("res:/light/missing.ies"), { code: "BLUE_STD_RESULT_IO_ERROR" });
  await assert.rejects(Tr2LightProfileRes.BakeLightProfile("res:/light/broken.ies"), { code: "BLUE_STD_RESULT_RUNTIME_ERROR", message: "Failed to parse IES file" });
});

test("GetThumbnail renders the lit room into a B8G8R8X8 bitmap (cpp:286-352)", async t =>
{
  withFiles(t, new Map([ [ "res:/light/test.ies", new TextEncoder().encode(IES) ] ]));

  const resource = new Tr2LightProfileRes();
  resource.path = "res:/light/test.ies";

  const width = 16;
  const height = 8;
  const thumbnail = await resource.GetThumbnail(width, height);

  assert.strictEqual(thumbnail.GetWidth(), width);
  assert.strictEqual(thumbnail.GetHeight(), height);
  assert.strictEqual(thumbnail.GetFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM);

  // Recompute pixels from the Carbon arithmetic, with the X rotation (cpp:302) written out.
  const strip = expectedStrip();
  const c = Math.cos(0.3);
  const s = Math.sin(0.3);
  const rotate = ([ x, y, z ]) => [ x, y * c - z * s, y * s + z * c ];

  const pixel = (i, j) =>
  {
    let x = i / width * 2 - 1;
    let y = -j / height * 2 + 1;
    x *= 1.3 * (width / height);
    y *= 1.3;

    const origin = rotate([ x, y - 0.2, -1 ]);
    const direction = rotate([ 0, 0, 1 ]);

    // Plane( 0, 0, 1, -1 ) and Plane( 0, 1, 0, 1 ).
    const tBack = -(-1 + origin[2]) / direction[2];
    const tBottom = -(1 + origin[1]) / direction[1];
    const t = tBack < tBottom ? tBack : tBottom;
    const p = origin.map((v, k) => v + direction[k] * t);

    const toPoint = [ p[0], p[1] - 0.7, p[2] - 0.98 ];
    const length = Math.hypot(...toPoint);
    const cs = -toPoint[1] / length;

    const lmx = Math.max(0, (-cs * 0.5 + 0.5) * 1024);
    const weight = lmx - Math.floor(lmx);
    const coord0 = Math.min(Math.floor(lmx), 1023);
    const coord1 = Math.min(coord0 + 1, 1023);
    const intensity = Math.pow(strip[coord0] * (1 - weight) + strip[coord1] * weight, 1 / 2.4);
    return intensity * 255;
  };

  const bytes = thumbnail.GetRawData();
  const pitch = thumbnail.GetPitch();
  let lit = 0;

  for (let j = 0; j < height; ++j)
  {
    for (let i = 0; i < width; ++i)
    {
      const at = j * pitch + i * 4;
      const expected = pixel(i, j);

      // All four bytes carry the one grey value (cpp:347-350).
      assert.strictEqual(bytes[at + 1], bytes[at]);
      assert.strictEqual(bytes[at + 2], bytes[at]);
      assert.strictEqual(bytes[at + 3], bytes[at]);
      assert.ok(Math.abs(bytes[at] - expected) <= 2, `pixel ${i},${j}: ${bytes[at]} vs ${expected}`);
      if (bytes[at] > 0) lit++;
    }
  }

  assert.ok(lit > 0, "the room is not black");
});

test("GetThumbnail fails with IO_ERROR when the path cannot be read, and RUNTIME_ERROR when it cannot be parsed", async t =>
{
  withFiles(t, new Map([ [ "res:/light/broken.ies", new TextEncoder().encode("TILT=INCLUDE\n") ] ]));

  const missing = new Tr2LightProfileRes();
  missing.path = "res:/light/missing.ies";
  await assert.rejects(missing.GetThumbnail(4, 4), { code: "BLUE_STD_RESULT_IO_ERROR" });

  const broken = new Tr2LightProfileRes();
  broken.path = "res:/light/broken.ies";
  await assert.rejects(broken.GetThumbnail(4, 4), { code: "BLUE_STD_RESULT_RUNTIME_ERROR", message: "Failed to parse IES file" });
});
