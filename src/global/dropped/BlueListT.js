// Source: blueexposure/include/BlueListUtil.h:431-452
// Disposition: Blue owns this alternate native list template. It takes an
// interface offset from T::ClassType_ and sorts through ListSorterT/GetRawRoot.
// This native wrapper conversion is unsupported; the ordinary BlueList port
// stores and passes JS object identities and is not an implementation of this
// alternate template. No replacement constructor, registration or public export.
// Revive only when a supported JS consumer requires a distinct wrapped value to
// raw-root conversion, with that conversion contract defined and qualified.

/** Records the unsupported native class-offset list template; ordinary BlueList does not port it. */
export class BlueListT {}
