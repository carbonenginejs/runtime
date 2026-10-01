// Source: blueexposure/include/BlueListUtil.h:172-427,506-781
// Disposition: Blue owns this shared object-list template implementation. Its
// IList operations and ICopierCustomAssignment body are absorbed by BlueList;
// explicit constructor configuration replaces T/ops and JS references replace
// pointer/reference-count storage. The separate implementation-template class
// is omitted, not registered or publicly exported. This does not claim its
// PyRepr, PyDebugExpand, PyDebugCollapse or debugItems Python wrapper surface is
// implemented. Revive only if a supported consumer requires a distinct native
// template implementation identity or an actual Python wrapper/debug bridge.

/** Records the shared typed-list implementation absorbed by BlueList, excluding Python wrapper support. */
export class BlueList_Impl {}
