const FORMAT_WEBGPU_PACKAGE_NAME = "@carbonenginejs/runtime-resource/formats/webgpu";
const FORMAT_WEBGPU_PACKAGE_VERSION = "0.11.1";
const WEBGPU_BACKEND_NAME = "webgpu";
const DXBC_WGSL_TRANSLATOR_NAME = "dxbc-js-wgsl";
const DXBC_WGSL_TRANSLATOR_VERSION = FORMAT_WEBGPU_PACKAGE_VERSION;

/**
 * Version of the `INFO`-shaped summary the package reports.
 *
 * The summary is now a **derived view** rather than a stored chunk, so this
 * versions what callers receive, not what is on the wire. Nothing in the
 * container carries it.
 */
const EFFECT_INFO_VERSION = 3;

export { DXBC_WGSL_TRANSLATOR_NAME, DXBC_WGSL_TRANSLATOR_VERSION, EFFECT_INFO_VERSION, FORMAT_WEBGPU_PACKAGE_NAME, FORMAT_WEBGPU_PACKAGE_VERSION, WEBGPU_BACKEND_NAME };
//# sourceMappingURL=packageMetadata.js.map
