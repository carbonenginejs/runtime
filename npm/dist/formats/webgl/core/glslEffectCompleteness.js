/**
 * Inspects CEWG stage records for complete WebGL2 raster passes.
 *
 * Geometry and compute stages are not raster-pair members. A raster pass is
 * complete only when both its vertex and pixel records exist and their shared
 * shader records contain successful translated source.
 *
 * Stages reference shaders by key. The older shape that inlined the shader into
 * the stage record has no producer left — both callers pass a shader table, and
 * the container decoder always builds one — so the branch that supported it is
 * gone rather than kept as an untested path.
 *
 * @param {object[]} stages Stage records.
 * @param {object[]} shaders Translated shader records.
 * @returns {{ expectedPassCount: number, completePassCount: number, incompletePasses: object[] }}
 */
function inspectRasterCompleteness(stages, shaders) {
  const shaderMap = new Map((shaders || []).map(shader => [shader.key, shader]));
  const groups = new Map();
  for (const stage of stages || []) {
    if (stage.stageName !== "vertex" && stage.stageName !== "pixel") continue;
    const key = [stage.bodyKey || "selected", stage.techniqueName || "Main", Number.isInteger(stage.passIndex) ? stage.passIndex : 0].join(":");
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        bodyKey: stage.bodyKey || "selected",
        techniqueName: stage.techniqueName || "Main",
        passIndex: Number.isInteger(stage.passIndex) ? stage.passIndex : 0,
        vertex: null,
        pixel: null,
        duplicateStages: []
      };
      groups.set(key, group);
    }
    if (group[stage.stageName]) {
      group.duplicateStages.push(stage.stageName);
    }
    group[stage.stageName] = stage;
  }
  const incompletePasses = [];
  let completePassCount = 0;
  for (const group of groups.values()) {
    const missingStages = [];
    const unavailableStages = [];
    for (const stageName of ["vertex", "pixel"]) {
      const stage = group[stageName];
      if (!stage) {
        missingStages.push(stageName);
        continue;
      }
      const shader = shaderMap.get(stage.shaderKey);
      if (!shader?.hlsl2webgl?.ok || !shader.source) {
        unavailableStages.push({
          stageName,
          stageKey: stage.key,
          shaderKey: stage.shaderKey,
          excluded: shader?.excluded || null,
          reason: shader?.hlsl2webgl?.validationError || shader?.hlsl2webgl?.reason || shader?.hlsl2webgl?.error || shader?.excluded?.reason || "translated source is unavailable"
        });
      }
    }
    if (!missingStages.length && !unavailableStages.length && !group.duplicateStages.length) {
      completePassCount += 1;
      continue;
    }
    incompletePasses.push({
      key: group.key,
      bodyKey: group.bodyKey,
      techniqueName: group.techniqueName,
      passIndex: group.passIndex,
      missingStages,
      unavailableStages,
      duplicateStages: [...new Set(group.duplicateStages)].sort()
    });
  }
  return {
    expectedPassCount: groups.size,
    completePassCount,
    incompletePasses
  };
}

export { inspectRasterCompleteness };
//# sourceMappingURL=glslEffectCompleteness.js.map
