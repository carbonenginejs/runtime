export const FORMAT_WEBGPU_PACKAGE_NAME = "@carbonenginejs/runtime-resource/formats/webgpu";
export const FORMAT_WEBGPU_PACKAGE_VERSION = "0.11.1";
export const WEBGPU_BACKEND_NAME = "webgpu";
export const DXBC_WGSL_TRANSLATOR_NAME = "dxbc-js-wgsl";
export const DXBC_WGSL_TRANSLATOR_VERSION = FORMAT_WEBGPU_PACKAGE_VERSION;

/**
 * Version of the `INFO`-shaped summary the package reports.
 *
 * The summary is now a **derived view** rather than a stored chunk, so this
 * versions what callers receive, not what is on the wire. Nothing in the
 * container carries it.
 */
export const EFFECT_INFO_VERSION = 3;
