// Source: blueexposure/include/BlueClass.h:31-50 (RootQIImpl<T>)
// Disposition: not applicable as a class; its behaviour lives on IRoot.
// RootQIImpl<T> derives from T so that every final Blue class gets the same
// QueryInterface (BlueClass.h:38-40, BeClasses->QueryThisInterface with
// T::ClassType_()) and GetRootObject (BlueClass.h:42-49, a cast through void*
// that undoes multiple-inheritance pointer offsets). JavaScript has no class
// templates and no base-pointer offsets, and every Blue class already extends
// IRoot, so IRoot carries both once: IRoot.QueryInterface and
// IRoot.GetRootObject (src/global/blue/IRoot.js), with IRoot.ClassType for the
// ClassInfo part the header comment names (BlueClass.h:31).
// No runtime registration or export.

/** Records the QueryInterface/GetRootObject mixin that IRoot carries in JavaScript. */
export class RootQIImpl {}
