// Source: blueexposure/include/ICopier.h
//
// The copier as its CALLERS see it. `Copier` is the one implementation;
// `be.classes.CopyTo`/`CloneTo` are how most callers reach it. The hook a
// class implements for state outside its members is ICopierCustomAssignment.
import { CjsSchema, blue } from "#schema";

/** `ICopier` - copies a Blue object through its persisted members, per blueexposure/include/ICopier.h. */
export class ICopier
{
  /** Carbon's `ICopier::OverrideResult`: what a copy-override callback decided. */
  static OverrideResult = Object.freeze({
    SUCCESS: 0,
    FAILURE: 1,
    FALLBACK: 2
  });

  /**
   * `SetCopyOverrideCallback` - a callback that may copy an object itself
   * before the copier does, and the context it is called with.
   *
   * @param {Function|null} _copyOverride The callback.
   * @param {*} _context Passed to the callback as its last argument.
   */
  SetCopyOverrideCallback(_copyOverride, _context) {}

  /**
   * `SetPostCopyCallback` - a callback run on every object after it is
   * copied, and the context it is called with.
   *
   * @param {Function|null} _postCopy The callback.
   * @param {*} _context Passed to the callback as its last argument.
   */
  SetPostCopyCallback(_postCopy, _context) {}

  /** `CopyTo` - copy `source` into `dest`, creating `dest` when it is null. */
  CopyTo(_source, _dest) {}
}

for (const method of [ "SetCopyOverrideCallback", "SetPostCopyCallback", "CopyTo" ])
{
  CjsSchema.decorateMethod(ICopier, method, blue.abstract);
}

CjsSchema.exposure.interface("ICopier")(ICopier);

