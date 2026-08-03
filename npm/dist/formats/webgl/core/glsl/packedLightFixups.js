/**
 * Post-emission fixups for the packed local-light path.
 *
 * Both correct a real hazard rather than a cosmetic one, and both used to live
 * in the CLI packager where only its legacy diagnostic path applied them. That
 * meant asking for packed lights through the library produced GLSL missing both.
 * They belong on the shared emission path so every caller gets them.
 *
 * These are textual rewrites over emitted GLSL, which is not where this logic
 * ideally lives — the emitter should not produce the idiom in the first place.
 * Moving them is a faithful transfer, not an endorsement of the technique.
 */

/**
 * Keeps packed local-light enabled-flag tests in integer space.
 *
 * The emitter represents structured-buffer uint lanes in vec registers by
 * round-tripping through uintBitsToFloat/floatBitsToUint. The translated
 * Carbon light flag idiom can otherwise become:
 *
 *   mask = uintBitsToFloat(floatBitsToUint(flags) & 65536u);
 *   mask = uintBitsToFloat((floatBitsToInt(mask) != 0) ? 0xFFFFFFFFu : 0u);
 *
 * For packed light texture fetches, collapse that to a direct uint mask test
 * while preserving the downstream float-mask representation.
 *
 * @param {string} source GLSL source.
 * @param {object} record Shader record.
 * @returns {string} Rewritten GLSL source.
 */
function fixPackedLightFlagMask(source, record) {
  if (record?.stageName !== "pixel" || !source.includes("cjsLocalLightTexture")) return source;
  return source.replace(/(\s*)([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])?) = uintBitsToFloat\(floatBitsToUint\(([^;\r\n]+?)\) & 65536u\);\r?\n\s*\2 = uintBitsToFloat\(\(floatBitsToInt\(\2\) != 0\) \? 0xFFFFFFFFu : 0u\);/g, (_match, indent, maskTarget, flagsSource) => `${indent}${maskTarget} = uintBitsToFloat(((floatBitsToUint(${flagsSource}) & 65536u) != 0u) ? 1u : 0u);`);
}

/**
 * Keeps the packed local-light combined radius/enabled mask out of float
 * registers when it is immediately used for branch control.
 *
 * The all-bits mask value 0xFFFFFFFF is a NaN if stored through
 * uintBitsToFloat. Some drivers preserve the raw bits, but branch control
 * should not depend on NaN payload preservation.
 *
 * @param {string} source GLSL source.
 * @param {object} record Shader record.
 * @returns {string} Rewritten GLSL source.
 */
function fixPackedLightAcceptedMask(source, record) {
  if (record?.stageName !== "pixel" || !source.includes("cjsLocalLightTexture")) return source;
  const directAccepted = source.replace(/(\s*)[A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])? = uintBitsToFloat\(\(([^;\r\n]+?)\) \? (?:0xFFFFFFFFu|1u) : 0u\);\r?\n\s*[A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])? = uintBitsToFloat\(\(floatBitsToUint\(([^;\r\n]+?)\) & 65536u\) != 0u\) \? (?:0xFFFFFFFFu|1u) : 0u\);\r?\n\s*[A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])? = uintBitsToFloat\(floatBitsToUint\([^)]+\) & floatBitsToUint\([^)]+\)\);\r?\n\s*if \(floatBitsToUint\([^)]+\) != 0u\) \{/g, (_match, indent, radiusCondition, flagsSource) => {
    const flagTest = buildPackedLightFlagUintTest(source, flagsSource);
    return `${indent}if ((${radiusCondition}) && (${flagTest})) {`;
  });
  const directMaskBranch = directAccepted.replace(/(\s*)([A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])?) = uintBitsToFloat\(floatBitsToUint\(([^)]+)\) & floatBitsToUint\(([^)]+)\)\);\r?\n\s*if \(floatBitsToUint\(\2\) != 0u\) \{/g, (_match, indent, _target, leftMask, rightMask) => `${indent}if ((floatBitsToUint(${leftMask}) & floatBitsToUint(${rightMask})) != 0u) {`);
  return directMaskBranch.replace(/(\s*)[A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])? = uintBitsToFloat\(\(([^;\r\n]+?)\) \? 0xFFFFFFFFu : 0u\);\r?\n\s*[A-Za-z_][A-Za-z0-9_]*(?:\.[xyzw])? = uintBitsToFloat\(\(\(floatBitsToUint\(([^;\r\n]+?)\) & 65536u\) != 0u\) \? 1u : 0u\);\r?\n\s*if \(\(floatBitsToUint\([^)]+\) & floatBitsToUint\([^)]+\)\) != 0u\) \{/g, (_match, indent, radiusCondition, flagsSource) => {
    const flagTest = buildPackedLightFlagUintTest(source, flagsSource);
    return `${indent}if ((${radiusCondition}) && (${flagTest})) {`;
  });
}

/**
 * Builds a direct uint flag test for a packed light flag register when possible.
 *
 * @param {string} source GLSL source.
 * @param {string} flagsSource Float register expression carrying row1.w.
 * @returns {string} GLSL boolean expression.
 */
function buildPackedLightFlagUintTest(source, flagsSource) {
  const escaped = flagsSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignPattern = new RegExp(`${escaped}\\s*=\\s*uintBitsToFloat\\((texelFetch\\(cjsLocalLightTexture,[^;\\r\\n]+\\[[^;\\r\\n]+\\])\\);`);
  const match = assignPattern.exec(source);
  return match ? `((${match[1]}) & 65536u) != 0u` : `(floatBitsToUint(${flagsSource}) & 65536u) != 0u`;
}

/**
 * Applies temporary packed-light fragment debug paints.
 *
 * @param {string} source GLSL source.
 * @param {object} record Shader record.
 * @param {object} args Parsed options.
 * @returns {string} Debug-painted GLSL source.

/**
 * Applies every packed local-light fixup, in order.
 *
 * @param {string} source Emitted GLSL source.
 * @param {string} stageName Emitted stage name.
 * @returns {string} Fixed GLSL source.
 */
function applyPackedLightFixups(source, stageName) {
  const record = {
    stageName
  };
  return fixPackedLightAcceptedMask(fixPackedLightFlagMask(source, record), record);
}

export { applyPackedLightFixups, fixPackedLightAcceptedMask, fixPackedLightFlagMask };
//# sourceMappingURL=packedLightFixups.js.map
