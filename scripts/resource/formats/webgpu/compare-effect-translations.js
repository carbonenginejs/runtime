// CPU-only exact regression comparison over every unique body and complete pass.
// Capture before editing the translator; compare afterward using identical inputs.
// Output contains translated game shaders and stays in the caller-specified directory.
// No GPU, browser, network, resource acquisition, or source-tree mutation occurs.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readEffectAnalysis } from '../../../../src/resource/formats/webgpu/core/effectAnalysis.js';
import { buildEffectBackendBodySet } from '../../../../src/resource/formats/webgpu/core/effectBackendBodySet.js';
import { buildEffectPermutationGraph } from '../../../../src/resource/format/effect/effectPermutationGraph.js';
import { enumerateUniqueEffectBodies } from '../../../../src/resource/format/effect/effectBodyInventory.js';
import { rejectRefusedEffect } from '../../../../src/resource/formats/webgpu/core/packageEffect.js';
const [mode, rootArgument, destination, baseline] = process.argv.slice(2);
if (!['capture', 'compare'].includes(mode) || !rootArgument || !destination || mode === 'compare' && !baseline) throw Error('capture <dx11-root> <output> | compare <dx11-root> <output> <baseline>');
const root = resolve(rootArgument);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
/** Enumerate compiled DX11 effects without reading unrelated files. */
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, {
    withFileTypes: true
  })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) for (const child of walk(p)) out.push(child);else if (/\.sm_(lo|hi|depth)$/u.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(root).sort();
if (mode === 'compare') {
  const comparable = path => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path);
  if (comparable(destination) === comparable(baseline)) throw Error('Comparison output must not overwrite the baseline');
  const captured = JSON.parse(readFileSync(resolve(baseline, 'summary.json'), 'utf8'));
  if (captured.files !== files.length) throw Error('Corpus file count changed');
}
mkdirSync(destination, {
  recursive: true
});
const summary = {
  files: 0,
  permutations: 0,
  uniqueBodies: 0,
  emittedShaderOccurrences: 0,
  identicalShaderOccurrences: 0,
  newShaderOccurrences: 0,
  changed: [],
  regressed: [],
  newPasses: [],
  failures: []
};
for (const file of files) {
  const name = relative(root, file).replaceAll('\\', '/');
  const bytes = readFileSync(file),
    source = 'res:/graphics/effect.dx11/' + name;
  const record = {
    name,
    inputSha256: digest(bytes),
    entries: {},
    errors: {},
    permutations: 0,
    uniqueBodies: 0
  };
  try {
    rejectRefusedEffect(source);
    const {
      effectRes
    } = readEffectAnalysis(bytes, {
      source
    });
    const graph = buildEffectPermutationGraph(effectRes),
      groups = enumerateUniqueEffectBodies(effectRes);
    record.permutations = graph.variants.length;
    record.uniqueBodies = groups.length;
    record.graph = graph;
    const selections = new Map();
    for (const group of groups) {
      const effect = effectRes.GetShaderByIndex(group.permutationIndex).GetEffectDescription();
      for (const technique of effect.techniques) for (let passIndex = 0; passIndex < technique.passes.length; passIndex++) selections.set(technique.name + '.pass' + passIndex, {
        techniqueName: technique.name,
        passIndex
      });
    }
    for (const [passKey, selection] of selections) {
      try {
        const set = buildEffectBackendBodySet(effectRes, graph, {
          source,
          selection
        });
        const units = new Map(set.passUnits.map(unit => [unit.key, unit]));
        for (const body of set.bodies) {
          const key = body.bodyKey + '/' + passKey;
          if (body.status !== 'translated') {
            record.errors[key] = body.error;
            continue;
          }
          const unit = units.get(body.passes[0].unitKey);
          record.entries[key] = {
            shaders: unit.shaders,
            layouts: unit.layouts,
            resourceTransforms: unit.resourceTransforms ?? null
          };
        }
      } catch (error) {
        record.errors[passKey] = String(error.message);
      }
    }
  } catch (error) {
    record.error = String(error.message);
  }
  const filename = digest(name) + '.json.gz';
  writeFileSync(resolve(destination, filename), gzipSync(JSON.stringify(record), {
    level: 1
  }));
  summary.files++;
  summary.permutations += record.permutations;
  summary.uniqueBodies += record.uniqueBodies;
  for (const value of Object.values(record.entries)) summary.emittedShaderOccurrences += value.shaders.length;
  if (mode === 'compare') {
    const before = JSON.parse(gunzipSync(readFileSync(resolve(baseline, filename))));
    if (before.inputSha256 !== record.inputSha256) throw Error('Input changed: ' + name);
    if (JSON.stringify(before.graph) !== JSON.stringify(record.graph)) throw Error('Graph changed: ' + name);
    for (const [key, old] of Object.entries(before.entries)) {
      const current = record.entries[key];
      if (!current) {
        summary.regressed.push({
          name,
          key,
          error: record.errors[key] ?? record.errors[key.split('/').at(-1)] ?? record.error
        });
        continue;
      }
      // Compare the complete emitted records, including exact WGSL strings and layouts.
      if (JSON.stringify(old) !== JSON.stringify(current)) summary.changed.push({
        name,
        key
      });else summary.identicalShaderOccurrences += old.shaders.length;
    }
    for (const [key, value] of Object.entries(record.entries)) if (!before.entries[key]) {
      summary.newShaderOccurrences += value.shaders.length;
      summary.newPasses.push({
        name,
        key,
        shaders: value.shaders.map(s => ({
          key: s.key,
          sha256: digest(s.code)
        }))
      });
    }
    if (before.error !== record.error) summary.failures.push({
      name,
      before: before.error,
      after: record.error
    });
  }
  if (summary.files % 25 === 0) console.log(JSON.stringify({
    files: summary.files,
    identical: summary.identicalShaderOccurrences,
    emitted: summary.emittedShaderOccurrences,
    changed: summary.changed.length,
    regressed: summary.regressed.length
  }));
}
writeFileSync(resolve(destination, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  ...summary,
  newPasses: summary.newPasses.length
}));
if (summary.changed.length || summary.regressed.length || summary.failures.length) process.exitCode = 1;
