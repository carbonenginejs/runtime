/** Identical identifier/syntax/whitespace minification for both validation builds. */
export const minifyOptions = Object.freeze({
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: true,
    sourcesContent: true,
    legalComments: "eof"
});
