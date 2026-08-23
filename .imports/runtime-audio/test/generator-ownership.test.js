import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  assertGeneratedTargetWritable,
  isGeneratedClassSource,
} from "../scripts/generate_trinity_ownership.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath)
{
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("generator provenance distinguishes generated and maintained audio source", () =>
{
  assert.equal(isGeneratedClassSource(read("src/trinity/audio/AudEventKey.js")), true);
  assert.equal(isGeneratedClassSource(read("src/trinity/audio/AudActionLog.js")), false);
  assert.equal(isGeneratedClassSource(read("src/trinity/audio/AudObstructionOcclusion.js")), false);
});

test("generator refuses to overwrite maintained audio source", () =>
{
  assert.doesNotThrow(() => assertGeneratedTargetWritable(
    "AudEventKey.js",
    read("src/trinity/audio/AudEventKey.js"),
  ));
  assert.throws(
    () => assertGeneratedTargetWritable(
      "AudActionLog.js",
      read("src/trinity/audio/AudActionLog.js"),
    ),
    /Refusing to overwrite maintained source/,
  );
});
