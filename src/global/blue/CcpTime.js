// Source: core/include/CcpTime.h:38-46
// Source: core/CcpTime.cpp:219-246 (TimeAsDouble), :271-286 (TimeIsUTC),
//         :149-186 (TimeAsDateTime, TimeFromDateTime - the !_WIN32 branch)
//
// Carbon's clock is an integer count of 100ns ticks, and nearly every consumer
// that wants seconds goes through `TimeAsDouble`. It was missing here, which is
// how `Tr2DistanceTracker` ended up sampling its curves at time 0 forever.
//
// NOTE ON DECORATORS: this folder cannot use `@` syntax. `package.json` maps
// both `#blue` and the public `./blue` export to `src`, so a decorator here is
// a SyntaxError for importers. Plain functions only.

/** Ticks per second: Carbon's clock is 100-nanosecond units. */
const TICKS_PER_SECOND = 10000000;

/** Ticks per millisecond, the resolution `TimeAsDouble` truncates UTC to. */
const TICKS_PER_MILLISECOND = 10000;

/**
 * Milliseconds between the Blue epoch (1601) and the Unix epoch (1970).
 * `core/CcpTime.cpp:145` - `11644473600LL * 1000L`.
 */
const MS_TO_UNIX_EPOCH = 11644473600000;

/**
 * `TimeIsUTC` - whether this stamp is absolute Blue UTC or a stopwatch reading.
 *
 * Carbon's own reasoning, kept because the constant is otherwise unreadable:
 * "if time is later than the 18th century, let's rule it UTC". Blue UTC counts
 * from 1600, so anything past 63072000000000000 ticks cannot be a stopwatch.
 *
 * @param {number} time Blue time, in 100ns ticks.
 * @returns {boolean} True for absolute UTC, false for a stopwatch reading.
 */
export function TimeIsUTC(time)
{
  return time > 63072000000000000;
}

/**
 * `TimeAsDouble` - Blue ticks as seconds.
 *
 * The two branches are not the same calculation, and the difference is
 * deliberate in the donor: a UTC stamp is truncated to MILLISECOND resolution
 * (`(time / 10000) / 1000.0`, integer division first), while a stopwatch
 * reading keeps the full 100ns precision. Carbon does this because a UTC value
 * is large enough that the low digits are noise.
 *
 * @impl.reason C++ divides `CcpTime` as an integer; JavaScript's `/` is
 * floating point, so each of the donor's integer divisions is written as an
 * explicit `Math.trunc`. Without that the UTC branch would silently keep the
 * sub-millisecond digits the donor drops.
 *
 * A caveat the donor does not have: a present-day UTC tick count is about
 * 1.3e17, past `Number.MAX_SAFE_INTEGER` (9.007e15), so the input itself
 * carries roughly 1.6 microseconds of quantisation before this function sees
 * it. Immaterial against a branch that truncates to milliseconds anyway, and
 * noted so it is not rediscovered as a bug.
 *
 * @param {number} time Blue time, in 100ns ticks.
 * @returns {number} Seconds.
 */
export function TimeAsDouble(time)
{
  const seconds = Math.trunc(time / TICKS_PER_SECOND);
  const remainder = time - (seconds * TICKS_PER_SECOND);

  if (TimeIsUTC(time))
  {
    return seconds + (Math.trunc(remainder / TICKS_PER_MILLISECOND) / 1000);
  }

  return seconds + (remainder / TICKS_PER_SECOND);
}


/**
 * `TimeAsDateTime` - a Blue timestamp broken into UTC calendar fields.
 *
 * @impl.reason Carbon has two implementations. On Windows it is one
 * `FileTimeToSystemTime` reinterpret_cast (`CcpTime.cpp:50-53`), because
 * `CcpDateTime` is laid out as SYSTEMTIME; there is no such call here, so this
 * ports the `!_WIN32` branch (`:149-161`) which does the arithmetic explicitly.
 * `gmtime` becomes the `getUTC*` accessors, which are the same calendar.
 *
 * The donor fills an out-parameter and returns a bool. This one can keep BOTH,
 * because the out-parameter is an object and JavaScript passes the reference -
 * so the struct is filled in place exactly as the donor does. Its partner
 * cannot: a number has no reference to fill, which is why `TimeFromDateTime`
 * returns `{ok, time}` instead. The pair is deliberately asymmetric for that
 * reason alone, following `ITriReroutable.GetDestination`, which returns
 * `{dest, size}` for the same platform limit.
 *
 * @param {import("./CcpDateTime.js").CcpDateTime} dateTime Filled in place.
 * @param {number} time Blue time, in 100ns ticks.
 * @returns {boolean} False when the timestamp is not a representable date.
 */
export function TimeAsDateTime(dateTime, time)
{
  const ms = Math.trunc(time / TICKS_PER_MILLISECOND) - MS_TO_UNIX_EPOCH;
  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) return false;

  dateTime.year = date.getUTCFullYear();
  dateTime.month = date.getUTCMonth() + 1;
  dateTime.dayOfWeek = date.getUTCDay();
  dateTime.day = date.getUTCDate();
  dateTime.hour = date.getUTCHours();
  dateTime.minute = date.getUTCMinutes();
  dateTime.second = date.getUTCSeconds();

  // The donor takes this from the tick count rather than from the calendar
  // conversion: `( time / TICKS_PER_MS ) % 1000`.
  dateTime.milliseconds = Math.trunc(time / TICKS_PER_MILLISECOND) % 1000;

  return true;
}

/**
 * `TimeFromDateTime` - UTC calendar fields back to a Blue timestamp.
 *
 * `dayOfWeek` is ignored, as it is in the donor: `timegm` derives the weekday
 * from the date, so the field is output-only in practice.
 *
 * @impl.reason `timegm` becomes `Date.UTC`. The donor's failure test is
 * `timestamp < 0`, which rejects any date before 1970 - NOT before 1601, even
 * though the Blue epoch reaches back that far. That asymmetry is the donor's
 * and is reproduced rather than corrected, because a timestamp this function
 * refuses is one `TimeAsDateTime` will happily produce, and code on either side
 * may depend on the existing boundary.
 *
 * @param {import("./CcpDateTime.js").CcpDateTime} dateTime The calendar fields.
 * @returns {{ok: boolean, time: number}} The Blue timestamp, in 100ns ticks.
 */
export function TimeFromDateTime(dateTime)
{
  // `Date.UTC` remaps years 0-99 onto 1900-1999, which `timegm` does not do -
  // the donor assigns `tm_year = year - 1900` and lets year 50 become 1950 BC-
  // adjacent nonsense that its `timestamp < 0` test then rejects. Without this
  // the two would disagree on exactly the inputs the donor refuses, so the year
  // is set explicitly to defeat the remap.
  const utc = new Date(0);
  utc.setUTCFullYear(dateTime.year, dateTime.month - 1, dateTime.day);
  utc.setUTCHours(dateTime.hour, dateTime.minute, dateTime.second, 0);

  const seconds = utc.getTime() / 1000;

  if (!Number.isFinite(seconds) || seconds < 0) return { ok: false, time: 0 };

  const ms = (seconds * 1000) + dateTime.milliseconds + MS_TO_UNIX_EPOCH;
  return { ok: true, time: ms * TICKS_PER_MILLISECOND };
}
