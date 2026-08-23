import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuTrinityPassEncoder } from "../src/core/trinityPassEncoder.js";

function boundary(rejectType = null)
{
  const calls = [];
  const dispatcher = {
    EncodeBatchType(pass, preparedBatchMap, batchType)
    {
      calls.push([ "encode", pass, preparedBatchMap, batchType ]);
      if (batchType === rejectType) throw new Error(`rejected type ${batchType}`);
    }
  };
  const commandEncoder = {
    beginRenderPass(descriptor)
    {
      const pass = {
        descriptor,
        ended: 0,
        end()
        {
          this.ended += 1;
          calls.push([ "end", this ]);
        }
      };
      calls.push([ "begin", descriptor, pass ]);
      return pass;
    }
  };
  return { calls, commandEncoder, dispatcher };
}

test("Trinity pass encoder preserves caller pass and batch-type order", () =>
{
  const target = boundary();
  const encoder = new CjsWebgpuTrinityPassEncoder(target.dispatcher);
  const mainMap = { id: "main-map" };
  const depthMap = { id: "depth-map" };
  const mainDescriptor = { label: "main" };
  const transparentDescriptor = { label: "transparent" };

  const count = encoder.Encode(target.commandEncoder, [
    {
      descriptor: mainDescriptor,
      configure(pass, passIndex)
      {
        assert.equal(passIndex, 0);
        target.calls.push([ "configure", pass ]);
      },
      selections: [
        { preparedBatchMap: mainMap, batchType: 0 },
        { preparedBatchMap: mainMap, batchType: 1 }
      ]
    },
    {
      descriptor: transparentDescriptor,
      selections: [
        { preparedBatchMap: depthMap, batchType: 2 },
        { preparedBatchMap: mainMap, batchType: 4 }
      ]
    }
  ]);

  assert.equal(count, 4);
  assert.deepEqual(
    target.calls.map((entry) => entry[0] === "encode"
      ? [ entry[0], entry[2].id, entry[3] ]
      : [ entry[0], entry[1]?.label ?? null ]),
    [
      [ "begin", "main" ],
      [ "configure", null ],
      [ "encode", "main-map", 0 ],
      [ "encode", "main-map", 1 ],
      [ "end", null ],
      [ "begin", "transparent" ],
      [ "encode", "depth-map", 2 ],
      [ "encode", "main-map", 4 ],
      [ "end", null ]
    ]
  );
  assert.equal(
    target.calls.filter(([ name ]) => name === "end").every((entry) => entry[1].ended === 1),
    true
  );
});

test("Trinity pass encoder validates the complete structural plan before beginning", () =>
{
  const target = boundary();
  const encoder = new CjsWebgpuTrinityPassEncoder(target.dispatcher);
  assert.throws(
    () => encoder.Encode(target.commandEncoder, [
      { descriptor: {}, selections: [] },
      { descriptor: {}, selections: [ { preparedBatchMap: {}, batchType: -1 } ] }
    ]),
    /batchType must be a non-negative integer/u
  );
  assert.equal(target.calls.length, 0);
  assert.throws(
    () => encoder.Encode(target.commandEncoder, {}),
    /passes must be an array/u
  );
});

test("Trinity pass encoder ends a begun pass when configuration or dispatch fails", () =>
{
  const rejected = boundary(2);
  const encoder = new CjsWebgpuTrinityPassEncoder(rejected.dispatcher);
  assert.throws(
    () => encoder.Encode(rejected.commandEncoder, [ {
      descriptor: { label: "failing" },
      selections: [
        { preparedBatchMap: {}, batchType: 0 },
        { preparedBatchMap: {}, batchType: 2 }
      ]
    } ]),
    /rejected type 2/u
  );
  assert.equal(rejected.calls.filter(([ name ]) => name === "end").length, 1);

  const asynchronous = boundary();
  assert.throws(
    () => new CjsWebgpuTrinityPassEncoder(asynchronous.dispatcher).Encode(
      asynchronous.commandEncoder,
      [ { descriptor: {}, configure: async () => {}, selections: [] } ]
    ),
    /configure must be synchronous/u
  );
  assert.equal(asynchronous.calls.filter(([ name ]) => name === "end").length, 1);
});
