// Source: blueexposure/include/BlueListUtil.h:152-168,436-452
// Disposition: Blue owns the BlueListT pointer-wrapper comparator. It calls
// GetRawRoot on both pointed-to values before invoking the comparison callback.
// That wrapper-to-root contract is unsupported; BlueList.Sort compares stored
// JS identities directly and is not credited as this helper's implementation.
// No replacement helper, runtime registration or public export. Revive only if
// a supported JS list consumer requires and defines this wrapper conversion.

/** Records the unsupported GetRawRoot pointer-wrapper comparator used by native BlueListT. */
export class ListSorterT {}
