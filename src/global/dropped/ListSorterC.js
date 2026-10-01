// Source: blueexposure/include/BlueListUtil.h:482-498
// Disposition: Blue owns this native value-reference comparator. It calls
// GetRawRoot on each T& value before invoking the comparison callback. No such
// wrapper-value container contract is supported by the current object BlueList;
// its direct-identity comparator is not a port of this helper. No replacement
// helper, runtime registration or public export. Revive only if a supported JS
// consumer requires and defines the native wrapped-value-to-root conversion.

/** Records the unsupported GetRawRoot value-reference comparator, with no current JS replacement. */
export class ListSorterC {}
