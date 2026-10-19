import { CjsSchema } from "#schema/CjsSchema";

// Source: core/include/CcpTime.h:25-36
//
// The calendar breakdown of a Blue timestamp. Carbon declares it field-for-field
// compatible with Win32's SYSTEMTIME, which is why `TimeAsDateTime` on Windows
// is a single `FileTimeToSystemTime` reinterpret_cast: the struct layout IS the
// conversion there. See CcpTime.js for the arithmetic we port instead.
//
// NOTE ON DECORATORS: this folder cannot use `@` syntax - `package.json` maps
// both `#blue` and the public `./blue` export to `src`, so a decorator here is
// a SyntaxError for importers.

/**
 * `CcpDateTime` - a UTC calendar breakdown, all fields `uint16_t` in the donor.
 *
 * Field order is Carbon's, which is SYSTEMTIME's, and `dayOfWeek` sits between
 * `month` and `day` for that reason rather than by preference. Keep the order:
 * on Windows the donor casts this straight onto SYSTEMTIME, so a reordering
 * would be a silent corruption there and is worth not teaching anyone here.
 *
 * `dayOfWeek` is OUTPUT ONLY. `TimeFromDateTime` never reads it - `timegm`
 * derives the weekday from the date - so setting it has no effect.
 */
export class CcpDateTime
{
  // Carbon's struct has no initializers (CcpTime.h:25-35), so every member is
  // unset there; 0 is the neutral value.

  /** Full year, e.g. 2026. Not offset from 1900, unlike the `tm` it is built from. Carbon leaves it unset. */
  year = 0;

  /** 1-12. One-based, unlike `tm_mon`. Carbon leaves it unset. */
  month = 0;

  /** 0-6, Sunday first. Output only - see the class note. Carbon leaves it unset. */
  dayOfWeek = 0;

  /** 1-31. Carbon leaves it unset. */
  day = 0;

  /** 0-23. Carbon leaves it unset. */
  hour = 0;

  /** 0-59. Carbon leaves it unset. */
  minute = 0;

  /** 0-59. Carbon leaves it unset. */
  second = 0;

  /** 0-999. Carbon leaves it unset. */
  milliseconds = 0;
}

CjsSchema.blue.define(CcpDateTime, { className: "CcpDateTime" });
