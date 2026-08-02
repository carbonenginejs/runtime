import assert from "node:assert/strict";
import test from "node:test";

import {
  busRtpcPathUses,
  evaluateBusRtpcGainDb,
  evaluateBusVoiceRtpcGainDb,
  indexBusRtpcCatalog,
} from "../npm/dist/internal/busRtpc.js";

test("Bus RTPC evaluation keeps Voice and Bus Volume properties distinct", () =>
{
  const catalog = indexBusRtpcCatalog({
    schemaVersion: 2,
    buses: {
      "500": [
        {
          property: "voice-volume",
          rtpc: "atmosphere",
          defaultValue: 0.5,
          points: [
            { x: 0, value: -1, interpolation: 4 },
            { x: 1, value: 0, interpolation: 4 },
          ],
        },
        {
          property: "bus-volume",
          rtpc: "world",
          defaultValue: 1,
          points: [
            { x: 0, value: -1, interpolation: 4 },
            { x: 1, value: 0, interpolation: 4 },
          ],
        },
      ],
      "1": [ {
        property: "voice-volume",
        rtpc: "parent",
        defaultValue: 1,
        points: [
          { x: 0, value: -1, interpolation: 4 },
          { x: 1, value: 0, interpolation: 4 },
        ],
      } ],
    },
  });
  const values = new Map([
    [ "atmosphere", 0.5 ],
    [ "world", 0.25 ],
    [ "parent", 0.5 ],
  ]);
  const read = name => values.get(name);
  const path = [ "500", "500", "1" ];

  assert.equal(busRtpcPathUses(catalog, path, "voice-volume"), true);
  assert.equal(busRtpcPathUses(catalog, path, "bus-volume"), true);
  assert.ok(Math.abs(
    evaluateBusVoiceRtpcGainDb(catalog, path, read)
      - 20 * Math.log10(0.25),
  ) < 1e-12);
  assert.ok(Math.abs(
    evaluateBusRtpcGainDb(catalog, path, read)
      - 20 * Math.log10(0.25),
  ) < 1e-12);
});

test("version-1 Bus RTPC curves remain implicit Bus Volume", () =>
{
  const catalog = indexBusRtpcCatalog({
    schemaVersion: 1,
    buses: {
      "500": [ {
        rtpc: "world",
        defaultValue: 0,
        points: [
          { x: 0, value: -1, interpolation: 4 },
          { x: 1, value: 0, interpolation: 4 },
        ],
      } ],
    },
  });

  assert.equal(busRtpcPathUses(catalog, [ "500" ], "voice-volume"), false);
  assert.equal(
    evaluateBusVoiceRtpcGainDb(catalog, [ "500" ], () => undefined),
    0,
  );
  assert.equal(
    evaluateBusRtpcGainDb(catalog, [ "500" ], () => undefined),
    -96.3,
  );
});
