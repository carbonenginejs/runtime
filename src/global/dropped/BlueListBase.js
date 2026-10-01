// Source: blueexposure/include/BlueListUtil.h:85-125
// Source: blueexposure/BlueListUtil.cpp:5
// Disposition: Blue owns this list implementation base. Its range checks are
// absorbed by BlueList's explicit operations and IsItemIndex helper, including
// documented JS rejection of invalid negative/non-integer item positions.
// The separate inheritance identity is not a supported runtime object. Native
// Python IndexError construction and the mListProps name table are not ported.
// No runtime registration or public export. Revive only if a supported consumer
// requires this distinct base, its property table, or a Python exception bridge.

/** Records the list bounds helper absorbed by BlueList, without its native Python diagnostics. */
export class BlueListBase {}
