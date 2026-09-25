/**
 * Granny GR2/GSF format: `CjsGr2Format` is the only export. It reads GR2
 * geometry, skeleton, animation and morph data and GSF state profiles, and
 * writes GR2 from CMF, in pure JavaScript with no native Granny library.
 * Section decoding covers None, Oodle1 and a clean-room BitKnit2 decoder;
 * licence notices are in the package `format-notices/gr2/`. Resource caching
 * and publication belong to `CjsResMan`; GPU realization belongs to engines.
 * The package root does not import or register this format.
 */
export { CjsGr2Format, default } from "./CjsGr2Format.js";
