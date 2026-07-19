import assert from "node:assert/strict";
import test from "node:test";
import { MediaType, PayloadType } from "@carbonenginejs/runtime-const/media";
import * as formats from "../src/formats/index.js";
// CjsFormat pulls in decorated probe code - test the consumer output.
import { CjsFormat } from "../npm/dist/index.js";

// Vocabulary conformance (kb §5.1): runtime-const owns the shared media
// vocabulary; formats declare against it. This test pins the canonical set so
// a format (including the dependency-free standalone packages mirrored here)
// can never drift to an unshared token.

const CANONICAL_MEDIA = new Set(Object.values(MediaType));

test("CjsFormat exposes the runtime-const vocabulary objects by identity", () =>
{
  assert.equal(CjsFormat.MediaType, MediaType, "CjsFormat.MediaType is the runtime-const object, not a copy");
  assert.equal(CjsFormat.Type, MediaType, "CjsFormat.Type shares the same object");
  assert.equal(CjsFormat.OutputType.AUDIO, PayloadType.AUDIO);
  assert.equal(CjsFormat.OutputType.RAW, PayloadType.RAW);
});

test("every format declares type and mediaTypes from the canonical vocabulary", () =>
{
  const formatClasses = Object.entries(formats)
    .filter(([ name, value ]) => /^Cjs.+Format$/.test(name) && typeof value === "function");
  assert.ok(formatClasses.length >= 20, `expected the full format registry, saw ${formatClasses.length}`);
  for (const [ name, Format ] of formatClasses)
  {
    for (const token of Format.type ?? [])
    {
      assert.ok(CANONICAL_MEDIA.has(token), `${name}.type token "${token}" is not canonical MediaType vocabulary`);
    }
    for (const token of Format.mediaTypes ?? [])
    {
      assert.ok(CANONICAL_MEDIA.has(token), `${name}.mediaTypes token "${token}" is not canonical MediaType vocabulary`);
    }
    assert.ok((Format.type ?? []).length > 0, `${name} declares no type`);
    assert.ok((Format.mediaTypes ?? []).length > 0, `${name} declares no mediaTypes`);
  }
});
