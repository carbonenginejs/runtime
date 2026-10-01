// Source: blueexposure/include/BlueListUtil.h:131-149,459-476
// Disposition: Blue owns this pointer-list comparison adapter. BlueList.Sort
// retains its context-first boolean comparison using an Array.sort closure.
// Native BlueList sets the pointer offset to zero; JS passes the stored object
// identity directly and needs neither pointer arithmetic nor a functor object.
// The separate helper identity is omitted, not registered or publicly exported.
// Revive only if a supported consumer requires a separately stateful comparator
// or native pointer-offset conversion that the current object list cannot model.

/** Records the zero-offset pointer-list comparator absorbed by BlueList.Sort. */
export class ListSorter {}
