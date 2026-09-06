import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BackAndForth,
  EveDistributionPlacementGeneratorVolume,
  EveLineSet,
  FollowASpline,
  Tr2SSAO,
  Tr2Vector2Parameter,
  TriStepFilterVisibilityResults,
  TriVectorSequencer
} from "../../npm/dist/trinity/index.js";
import { Tr2MainWindowState } from "../../npm/dist/input/index.js";
import { Tr2ImageRes } from "../../npm/dist/resource/texture/index.js";
import { EveSOFDataDecalIndexBuffer } from "../../npm/dist/sof/shared/index.js";

/**
 * The four-method-tier ports (classification in
 * docs/research/ratchet-four-method-tier-2026-09-06.md).
 */

test("Tr2Vector2Parameter component utilities ride the reroute and sRGB machinery (cpp:265-334)", () =>
{
  const parameter = new Tr2Vector2Parameter();
  parameter.SetX(0.25);
  parameter.SetY(0.75);
  assert.equal(parameter.GetX(), 0.25);
  assert.equal(parameter.GetY(), 0.75);

  // A reroute destination reads back through GetX/GetY and takes writes.
  const destination = new Float32Array(2);
  parameter.SetDestination(destination);
  assert.deepEqual([ ...destination ], [ 0.25, 0.75 ], "SetDestination seeds the reroute");

  destination[0] = 0.5;
  assert.equal(parameter.GetX(), 0.5, "GetX refreshes from the reroute (cpp:265-273)");

  parameter.SetY(1);
  assert.equal(destination[1], 1, "SetY writes through the reroute (cpp:323-334)");
});

test("Tr2ImageRes memory accounting follows the load state (cpp:14-27)", () =>
{
  const image = new Tr2ImageRes();
  assert.equal(image.GetMemoryUsage(), 1024, "unloaded resources carry the 1024-byte placeholder");
  assert.equal(image.GetBitmap(), null);

  image.SetPayload({
    payloadType: "rgba", sourceFormat: "tga", width: 2, height: 2,
    pixelFormat: "rgba8unorm", data: new Uint8Array(16), strideBytes: 8,
    origin: "top-left", colorSpace: "srgb", alphaMode: "straight"
  });
  assert.equal(image.GetMemoryUsage(), 16, "the bitmap raw size once loaded");
  assert.equal(image.GetBitmap(), image.GetPayload(), "GetBitmap IS the decoded payload");
  assert.equal(typeof image.IsMemoryUsageKnown(), "boolean");
});

test("Tr2SSAO.hash is Carbon's uint32 bit-mix (cpp:535)", () =>
{
  assert.equal(Tr2SSAO.hash(1), 1);
  assert.equal(Tr2SSAO.hash(0xFFFFFFFF), 131072, "wraps as C++ uint32, via imul");
  assert.equal(Tr2SSAO.hash(0), 0);
});

test("Tr2MainWindowState.ToString carries Carbon's name over the same description", () =>
{
  const state = new Tr2MainWindowState();
  assert.equal(state.ToString(), state.toString());
  assert.match(state.ToString(), /adapter/);
});

test("TriStepFilterVisibilityResults setters are the Carbon surface (cpp:98-112, h:49-56)", () =>
{
  const step = new TriStepFilterVisibilityResults();
  const input = {};
  const output = {};
  step.SetEventFilter(0x0F);
  step.SetFilterType(TriStepFilterVisibilityResults.FilterType.EXCLUDE_OBJECTS_IN_LIST);
  step.SetInputResults(input);
  step.SetOutputResults(output);
  assert.equal(step.eventFilter, 0x0F);
  assert.equal(step.filterType, TriStepFilterVisibilityResults.FilterType.EXCLUDE_OBJECTS_IN_LIST);
  assert.equal(step.inputResults, input);
  assert.equal(step.outputResults, output);
});

function fakeVolume(log, name)
{
  let next = 1;
  return {
    RegisterForChanges(callback) { log.push([ name, "register" ]); this.callback = callback; return next++; },
    UnregisterForChanges(id) { log.push([ name, "unregister", id ]); }
  };
}

test("EveDistributionPlacementGeneratorVolume swaps subscriptions in Carbon's order (cpp:21-93)", () =>
{
  const generator = new EveDistributionPlacementGeneratorVolume();
  const log = [];
  const first = fakeVolume(log, "first");
  const second = fakeVolume(log, "second");

  generator.SetVolume(first);
  assert.equal(generator.GetVolume(), first);
  assert.deepEqual(log, [ [ "first", "register" ] ], "nothing to unsubscribe on the first set");

  generator.SetVolume(second);
  assert.deepEqual(log.slice(1), [ [ "first", "unregister", 1 ], [ "second", "register" ] ],
    "old volume unsubscribed BEFORE the new one subscribes");

  // The stored callback is RequestRegeneration.
  generator.GetInitialPlacements = undefined;
  second.callback();
  assert.equal(generator.IsRequestingRegeneration(), true);

  generator.SetVolume(null);
  assert.deepEqual(log.at(-1), [ "second", "unregister", 1 ]);
});

test("EveSOFDataDecalIndexBuffer speaks the ICustomPersist contract (cpp:958-978)", () =>
{
  const record = new EveSOFDataDecalIndexBuffer();

  const store = record.AllocateReadBuffer(16);
  assert.equal(store.length, 4);
  store.set([ 7, 8, 9, 10 ]);

  const { buffer, byteSize } = record.GetWriteBufferAndSize();
  assert.equal(byteSize, 16);
  assert.deepEqual([ ...buffer ], [ 7, 8, 9, 10 ]);

  // SetBufferAndSize IGNORES the pointer and only truncates (donor comment).
  record.SetBufferAndSize(new Uint32Array([ 99, 99 ]), 8);
  assert.deepEqual([ ...record.indexBuffer ], [ 7, 8 ], "truncated, incoming data ignored");

  record.ReleaseWriteBuffer();
  assert.deepEqual([ ...record.indexBuffer ], [ 7, 8 ], "release frees nothing");
});

test("BackAndForth locator readers null-guard their owner (cpp:356-372)", () =>
{
  const behavior = new BackAndForth();
  const outPosition = [ 0, 0, 0 ];
  const outDirection = [ 0, 0, 0 ];

  behavior.GetParentLocatorPosition(0, outPosition, outDirection);
  assert.deepEqual(outPosition, [ 0, 0, 0 ], "no parent leaves the out-vectors untouched");

  behavior.parent = {
    GetLocatorPositionFromSet(index, _world, set, out) { out[0] = 10 + index; },
    GetLocatorRotationFromSet(index, _w, set, out) { out[1] = 20 + index; }
  };
  behavior.GetParentLocatorPosition(2, outPosition, outDirection);
  assert.equal(outPosition[0], 12);
  assert.equal(outDirection[1], 22);

  behavior.target = behavior.parent;
  behavior.GetTargetLocatorPosition(3, outPosition, outDirection);
  assert.equal(outPosition[0], 13, "the target twin uses the same body");
});

test("FollowASpline registry: list events wire the callback; the registry flattens (cpp:37-67, 319-335)", () =>
{
  const spline = new FollowASpline();
  const tunnels = [ { id: 1 }, { id: 2 } ];
  const group = {
    GetTunnels: () => tunnels,
    SetSystemTunnelFunctionReferenceAndColor(callback, color) { this.callback = callback; this.color = color; }
  };
  spline.splineTunnels.push(group);

  // BELIST_INSERTED (0x08) on the watched list wires the callback.
  spline.OnListModified(0x08, 0, 0, group, spline.splineTunnels);
  assert.equal(group.color, 0xFF5555AA);
  assert.equal(typeof group.callback, "function");

  // A different list is ignored.
  const other = { SetSystemTunnelFunctionReferenceAndColor() { throw new Error("must not fire"); } };
  spline.OnListModified(0x08, 0, 0, other, []);

  spline.shouldReassignTunnelIDs = false;
  group.callback();
  assert.equal(spline.shouldReassignTunnelIDs, true, "the callback IS UpdateTunnelRegistry");
  assert.deepEqual(spline.privateTunnels, tunnels);
});

function constantCurve(x, y, z)
{
  return { GetValueAt(_time, out) { out[0] = x; out[1] = y; out[2] = z; return out; } };
}

test("TriVectorSequencer combiners follow Carbon's dispatch, including the else-averages arm (cpp:70-176)", () =>
{
  const sequencer = new TriVectorSequencer();
  sequencer.functions.push(constantCurve(2, 3, 4), constantCurve(5, 6, 7));
  const out = new Float32Array(3);

  sequencer.operator = TriVectorSequencer.TRIOPERATOR.TRIOP_MULTIPLY;
  assert.deepEqual([ ...sequencer.GetValueAt(0, out) ], [ 10, 18, 28 ], "seeds ones, multiplies component-wise");

  sequencer.operator = TriVectorSequencer.TRIOPERATOR.TRIOP_ADD;
  assert.deepEqual([ ...sequencer.GetValueAt(0, out) ], [ 7, 9, 11 ]);

  sequencer.operator = TriVectorSequencer.TRIOPERATOR.TRIOP_AVERAGE;
  assert.deepEqual([ ...sequencer.GetValueAt(0, out) ], [ 3.5, 4.5, 5.5 ], "per-sample multiplier");

  // Carbon's dispatch: any operator that is not MULTIPLY or ADD takes the
  // average arm - the donor's else, not an add default.
  sequencer.operator = 99;
  assert.deepEqual([ ...sequencer.GetValueAt(0, out) ], [ 3.5, 4.5, 5.5 ]);

  // Empty list: the infinite multiplier is never used; zeros come back.
  sequencer.functions.length = 0;
  assert.deepEqual([ ...sequencer.GetValueAtAverage(0, out) ], [ 0, 0, 0 ]);
});

test("EveLineSet.Initialize seeds Carbon's 100-line capacity watermark (cpp:35-42)", () =>
{
  const lines = new EveLineSet();
  assert.equal(lines.Initialize(), true);
  assert.equal(lines.maxCurrentLineCount, 100);
});
