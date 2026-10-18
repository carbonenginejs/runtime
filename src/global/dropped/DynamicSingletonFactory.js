// Source: blueexposure/include/BlueClass.h:309-335 (DynamicSingletonFactory<T>)
// Disposition: not applicable; neither of its two registrations is reached in JavaScript.
// DynamicSingletonFactory<T>::Create (BlueClass.h:315-334) keeps one
// function-static BlueWeakRef<IRoot> (:317): while the instance lives, every
// Create queries riid on it; otherwise it news a T and holds it weakly.
// Carbon registers exactly two classes with it, both with
// DISABLE_PYTHON_CONSTRUCTION:
// - MotherLode (MotherLode_Blue.cpp:7-12). No C++ caller creates it through the
//   registry; its one instance is BlueResMan's embedded m_loadObjectCache
//   (BlueResMan.h:123), which CjsBlueResMan constructs as its own member.
// - BluePyOS (BluePython_Blue.cpp:39), created by BlueOS.cpp:809. It is the
//   Python OS, which is not ported.
// Not a decision about JavaScript's ability: a WeakRef would express it. With
// no caller there is nothing to port. One residual difference: CjsMotherLode's
// registration keeps the registry's constructing default createFn
// (src/global/blue/classes/registry.js), so CreateInstance would return a
// fresh instance where Carbon returns the live one. Nothing calls it.
// No runtime registration or export.

/** Records the weak-reference singleton factory, whose two Carbon registrations no JavaScript caller reaches. */
export class DynamicSingletonFactory {}
