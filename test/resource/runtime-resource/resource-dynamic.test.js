import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeResourcePath } from "#utils/path";
import { num } from "../../../src/global/math/num.js";
import {
  CjsResMan,
  ParseColor,
  RasterizeSolidColor,
  RegisterSolidColorTexture,
  TriTextureRes
} from "../../../src/resource/index.js";

function countingManager()
{
  const counter = { reads: 0 };
  const resMan = new CjsResMan({
    source: { Read() { counter.reads += 1; return new Uint8Array(0); } }
  });
  return { resMan, counter };
}

test("ParseColor follows Carbon's stream extraction, including the empty-alpha quirk", () =>
{
  assert.deepEqual(ParseColor("1,0.5,0,1"), [ 1, 0.5, 0, 1 ]);
  // `>>` skips whitespace before numbers and before the comma character.
  assert.deepEqual(ParseColor(" 1 , 2,3 ,4"), [ 1, 2, 3, 4 ]);
  assert.deepEqual(ParseColor("1e1,-.5,+2,3"), [ 10, -0.5, 2, 3 ]);
  // Not at eof after alpha.
  assert.equal(ParseColor("1,2,3,4 "), null);
  assert.equal(ParseColor("1,2,3,4,5"), null);
  // A missing separator or a non-number.
  assert.equal(ParseColor("1,2,3"), null);
  assert.equal(ParseColor("a,1,1,1"), null);
  assert.equal(ParseColor(""), null);
  // quirk: alpha extraction fails at end of stream, eofbit is set, value is 0.
  assert.deepEqual(ParseColor("1,2,3,"), [ 1, 2, 3, 0 ]);
});

test("RasterizeSolidColor stores Carbon's half-float values in an rgba32float payload", () =>
{
  const payload = RasterizeSolidColor("dynamic:/color/2,0.1,0,1");
  assert.equal(payload.payloadType, "rgba");
  assert.equal(payload.pixelFormat, "rgba32float");
  assert.equal(payload.width, 1);
  assert.equal(payload.height, 1);
  assert.equal(payload.data instanceof Float32Array, true);
  // Above one survives: Carbon's texture is float, not clamped.
  assert.equal(payload.data[0], 2);
  // Quantized through the half-float codec, as Carbon's Float_16 is.
  assert.equal(payload.data[1], Math.fround(num.fromHalfFloat(num.toHalfFloat(0.1))));
  assert.notEqual(payload.data[1], Math.fround(0.1));
  assert.equal(RasterizeSolidColor("res:/texture.dds"), null);
  assert.equal(RasterizeSolidColor("dynamic:/color/1,2"), null);
});

test("dynamic:/color resolves through its constructor, shares by query, and never reads a source", async () =>
{
  const { resMan, counter } = countingManager();
  RegisterSolidColorTexture(resMan);

  const red = resMan.GetResource("dynamic:/color/1,0,0,1");
  assert.equal(red instanceof TriTextureRes, true);
  assert.equal(red.IsGood(), true);
  assert.equal(red.GetPayload().data[0], 1);
  assert.equal(resMan.GetResource("dynamic:/color/1,0,0,1"), red);
  assert.notEqual(resMan.GetResource("dynamic:/color/0,1,0,1"), red);

  await red.Ready();
  await resMan.GetObject("dynamic:/color/1,0,0,1");
  assert.equal(counter.reads, 0);
});

test("dynamic constructor names are lowercased and can be unregistered", () =>
{
  const { resMan } = countingManager();
  const built = [];
  resMan.RegisterResourceConstructor("Probe", {
    GetResource(query)
    {
      built.push(query);
      const resource = new TriTextureRes();
      resource.Initialize(`dynamic:/probe/${query}`);
      return resource;
    }
  });
  resMan.GetResource("dynamic:/PROBE/Some/Query");
  // Only the constructor name is lowercased: the query keeps its authored case,
  // because base64 gradient queries depend on it (BlueFileUtil.cpp:33-59).
  assert.deepEqual(built, [ "Some/Query" ]);

  resMan.UnregisterResourceConstructor("PROBE");
  assert.throws(
    () => resMan.GetResource("dynamic:/probe/other"),
    error => error.code === "CJS_RESMAN_DYNAMIC_CONSTRUCTOR_MISSING"
  );
});

test("an unknown dynamic name and a constructor yielding nothing are raised by name", () =>
{
  const { resMan } = countingManager();
  assert.throws(
    () => resMan.GetResource("dynamic:/nothing/here"),
    error => error.code === "CJS_RESMAN_DYNAMIC_CONSTRUCTOR_MISSING"
      && error.constructorName === "nothing"
  );
  resMan.RegisterResourceConstructor("empty", { GetResource() { return null; } });
  assert.throws(
    () => resMan.GetResource("dynamic:/empty/x"),
    error => error.code === "CJS_RESMAN_DYNAMIC_RESOURCE_UNAVAILABLE"
  );
  assert.throws(() => resMan.RegisterResourceConstructor("", { GetResource() {} }), TypeError);
  assert.throws(() => resMan.RegisterResourceConstructor("bad", {}), TypeError);
});

test("a malformed dynamic colour fails without falling back to a source read", async () =>
{
  const { resMan, counter } = countingManager();
  RegisterSolidColorTexture(resMan);

  const broken = resMan.GetResource("dynamic:/color/1,2");
  assert.equal(broken.IsFailed(), true);
  assert.equal(broken.IsGood(), false);
  assert.equal(broken.error.code, "CJS_TEXTURE_PROCEDURAL_PATH_INVALID");
  await assert.rejects(
    resMan.GetObject("dynamic:/color/1,2"),
    error => error.code === "CJS_TEXTURE_PROCEDURAL_PATH_INVALID"
  );
  assert.equal(counter.reads, 0);
});

test("dynamic paths keep their query, as Carbon's NormalizeResPath does", () =>
{
  // Only the name is lowercased; case, `+` and repeated slashes survive.
  assert.equal(normalizeResourcePath("dynamic:/Color/AbC+dE//fG"), "dynamic:/color/AbC+dE//fG");
  assert.equal(normalizeResourcePath("dynamic:/GRADIENT_1d/AaBb=="), "dynamic:/gradient_1d/AaBb==");
  // A backslash AT the separator becomes a slash; the one after `dynamic:` does not.
  assert.equal(normalizeResourcePath("dynamic:\\Color\\AbC"), "dynamic:\\color/AbC");
  // No query: the whole path is the name.
  assert.equal(normalizeResourcePath("dynamic:/COLOR"), "dynamic:/color");
  // An ordinary resource path is still lowercased and collapsed.
  assert.equal(normalizeResourcePath("res:/Texture//Ship.DDS"), "res:/texture/ship.dds");
});

test("a dynamic constructor registered under a backslash path still resolves", () =>
{
  const { resMan } = countingManager();
  const queries = [];
  resMan.RegisterResourceConstructor("probe", {
    GetResource(query)
    {
      queries.push(query);
      const resource = new TriTextureRes();
      resource.Initialize("dynamic:/probe/x");
      return resource;
    }
  });
  resMan.GetResource("dynamic:\\Probe\\KeepMe");
  assert.deepEqual(queries, [ "KeepMe" ]);
});
