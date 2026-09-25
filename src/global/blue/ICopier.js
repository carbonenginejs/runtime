// Source: blueexposure/include/ICopier.h
//
// The copier as its CALLERS see it. `Copier` is the one implementation;
// `blue.classes.CopyTo`/`CloneTo` are how most callers reach it. The hook a
// class implements for state outside its members is ICopierCustomAssignment.
import { CjsSchema, compose, impl } from "#schema";

/** `ICopier` - copies a Blue object through its persisted members, per blueexposure/include/ICopier.h. */
export class ICopier
{
  /** Carbon's `ICopier::OverrideResult`: what a copy-override callback decided. */
  static OverrideResult = Object.freeze({
    SUCCESS: 0,
    FAILURE: 1,
    FALLBACK: 2
  });

  /** `SetCopyOverrideCallback` - a callback that may copy an object itself before the copier does. */
  SetCopyOverrideCallback(_copyOverride) {}

  /** `SetPostCopyCallback` - a callback run on every object after it is copied. */
  SetPostCopyCallback(_postCopy) {}

  /** `CopyTo` - copy `source` into `dest`, creating `dest` when it is null. */
  CopyTo(_source, _dest) {}
}

for (const method of [ "SetCopyOverrideCallback", "SetPostCopyCallback", "CopyTo" ])
{
  CjsSchema.decorateMethod(ICopier, method, compose.abstract, impl.abstract);
}

CjsSchema.define(ICopier, { className: "ICopier", carbon: "ICopier", family: "blue", fields: {} });

