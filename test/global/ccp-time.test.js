import assert from "node:assert/strict";
import test from "node:test";

import { blue, CcpDateTime, TimeAsDateTime, TimeAsDouble, TimeFromDateTime, TimeIsUTC } from "../../npm/dist/global/blue/index.js";


// core/CcpTime.cpp:271-286. The threshold is a strict `>`, so the constant
// itself is NOT UTC - worth pinning because an `>=` here would reclassify a
// whole branch of the arithmetic below.
test("TimeIsUTC splits absolute Blue UTC from a stopwatch reading", () =>
{
  const EIGHTEENTH_CENTURY = 63072000000000000;

  assert.equal(TimeIsUTC(EIGHTEENTH_CENTURY), false, "the boundary itself is not UTC");
  assert.equal(TimeIsUTC(EIGHTEENTH_CENTURY + 10000000), true);

  assert.equal(TimeIsUTC(0), false);
  assert.equal(TimeIsUTC(10000000), false, "one second on a stopwatch");

  // The clock we actually ship must land on the UTC side, or every consumer
  // silently takes the wrong branch.
  assert.equal(TimeIsUTC(blue.os.GetActualTime()), true);
});


// core/CcpTime.cpp:219-246. The two branches are NOT the same calculation and
// the difference is the whole point of the function.
test("TimeAsDouble keeps 100ns precision for a stopwatch reading", () =>
{
  assert.equal(TimeAsDouble(0), 0);
  assert.equal(TimeAsDouble(10000000), 1, "exactly one second");
  assert.equal(TimeAsDouble(30005000), 3.0005);

  // A single tick is 100ns and must survive: this is the digit the UTC branch
  // deliberately discards, so if the branches were merged this is what breaks.
  assert.equal(TimeAsDouble(1), 1e-7);
  assert.equal(TimeAsDouble(9999), 0.0009999);
});


test("TimeAsDouble truncates a UTC stamp to milliseconds", () =>
{
  const base = 63072000000000000 + 10000000;

  assert.equal(TimeAsDouble(base), 6307200001);
  assert.equal(TimeAsDouble(base + 20000), 6307200001.002, "2ms is kept");

  // Integer division first: `(time / 10000) / 1000.0`. Plain floating-point
  // division would leave the sub-millisecond digits the donor drops, so this
  // asserts the `Math.trunc` the port has to add.
  assert.equal(TimeAsDouble(base + 21999), 6307200001.002, "sub-millisecond is dropped");
});


// Not a donor behaviour - a platform limit the donor does not have, asserted so
// it is not rediscovered later as a bug in this function.
test("a present-day UTC tick count is already quantised before TimeAsDouble sees it", () =>
{
  const now = blue.os.GetActualTime();

  assert.ok(now > Number.MAX_SAFE_INTEGER, "Blue UTC exceeds exact integer range");

  // Adding a single tick is a no-op at this magnitude, which IS the quantisation.
  assert.equal(now + 1, now, "one tick does not survive the addition");

  // Roughly 0.8 microseconds of spacing at this magnitude. The assertion is
  // deliberately loose: the point is the order, not the exact ulp.
  const spacing = (now + 16) - now;
  assert.ok(spacing >= 8, `ticks quantise in steps of ${spacing}`);

  // Which is immaterial against a branch that truncates to milliseconds: the
  // seconds part is exact either way.
  assert.equal(Number.isFinite(TimeAsDouble(now)), true);
  assert.ok(TimeAsDouble(now) > 13000000000, "still a sane seconds count");
});


test("TimeAsDateTime breaks a Blue timestamp into UTC calendar fields", () =>
{
  // 2026-09-18T12:34:56.789Z expressed in Blue ticks.
  const ms = Date.UTC(2026, 8, 18, 12, 34, 56) + 789;
  const time = (ms + 11644473600000) * 10000;

  const dt = new CcpDateTime();
  assert.equal(TimeAsDateTime(dt, time), true);

  assert.equal(dt.year, 2026);
  assert.equal(dt.month, 9, "one-based, unlike tm_mon");
  assert.equal(dt.day, 18);
  assert.equal(dt.hour, 12);
  assert.equal(dt.minute, 34);
  assert.equal(dt.second, 56);
  assert.equal(dt.milliseconds, 789);
  assert.equal(dt.dayOfWeek, 5, "Friday, zero-based from Sunday");
});


test("TimeFromDateTime inverts TimeAsDateTime", () =>
{
  const ms = Date.UTC(2026, 8, 18, 12, 34, 56) + 789;
  const time = (ms + 11644473600000) * 10000;

  const dt = new CcpDateTime();
  TimeAsDateTime(dt, time);

  const back = TimeFromDateTime(dt);
  assert.equal(back.ok, true);
  assert.equal(back.time, time, "round trip is exact at millisecond resolution");
});


// core/CcpTime.cpp:174-177. The donor rejects anything timegm puts before the
// Unix epoch, even though the Blue epoch reaches back to 1601. Reproduced
// rather than corrected - see the @impl.reason.
test("TimeFromDateTime refuses dates before 1970, as the donor does", () =>
{
  const dt = new CcpDateTime();
  dt.year = 1899;
  dt.month = 12;
  dt.day = 31;

  assert.equal(TimeFromDateTime(dt).ok, false);

  // And the two-digit-year trap: Date.UTC would read 50 as 1950 and accept it.
  const remapped = new CcpDateTime();
  remapped.year = 50;
  remapped.month = 1;
  remapped.day = 1;

  assert.equal(TimeFromDateTime(remapped).ok, false, "year 50 is year 50, not 1950");
});
