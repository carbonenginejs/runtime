/**
 * Historical Incarna classes: records from historical Black assets with no
 * current Carbon declaration, kept apart from `../trinity/`. Hydrating them
 * is not a claim of Carbon behaviour.
 *
 * - `interior/Tr2InteriorCell`: its name appears only in a Carbon comment; its
 *   fields come from the reviewed records.
 * - `curves/`: `Tr2ColorCurve`, `Tr2ColorKey`, `Tr2ScalarCurve`, `Tr2ScalarKey`
 *   adapt ccpwgl Curve2 evaluation. Carbon names its current curve classes
 *   the other way round (`Tr2CurveColor`, `Tr2CurveScalar`, in `trinity`).
 */
export * from "./curves/index.js";
export * from "./interior/index.js";
