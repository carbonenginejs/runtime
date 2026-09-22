import assert from "node:assert/strict";
import test from "node:test";

import * as formats from "../../npm/dist/resource/formats/index.js";

test("every format's id is its declared class name", () =>
{
  const classes = Object.entries(formats).filter(([ name, value ]) => typeof value === "function" && /^Cjs\w+Format$/.test(name) && "id" in value);
  assert.ok(classes.length > 30);
  for (const [ name, Format ] of classes) assert.equal(Format.id, name, name);
});
