import { cloneJson } from "./freeze.js";

/**
 * Backend body ingestion, from the one package shape.
 *
 * There used to be two. A `Carbon WebGPU` chunk package projected `backendBodySet` only
 * through a raw reader object, so the engine duck-typed `GetBackendBodyPrograms`
 * off it and projected a second, narrower shape for everything else. The chunk
 * package is gone: a `.carbonwebgpu` file is one Carbon v15 record container, and
 * its single emit already carries the body set as plain data.
 *
 * So the join happens once, in the producer. `deriveBackendBodySet` walks the
 * container calling `CarbonWebgpuContainer.GetBackendBodyPrograms` per distinct
 * body, and emits the result as `{passUnits, bodies}`. Nothing here decodes a
 * body, resolves an arena offset, or decides which permutations share one — it
 * indexes a join the container already made. Verified against that resolver over
 * all 480 permutations of `unpacked_quadv5.sm_hi`: zero divergences.
 *
 * Nothing here names a WebGPU type. A body/pass/unit graph is source-language
 * independent, and only the payload inside a unit is WGSL.
 */

const BODY_SET_FORMAT = "CJS_WGSL_BODY_SET";
const PERMUTATION_GRAPH_FORMAT = "CJS_EFFECT_PERMUTATION_GRAPH";

/**
 * Build an engine-owned view of a package's translated bodies.
 *
 * Returns null when the package carries no body set at all, which is a
 * legitimate state for hand-authored package data rather than an error.
 *
 * @param {object} value Plain package data carrying `backendBodySet`.
 * @returns {object|null} Backend body source, or null when there is no body set.
 */
export function createBackendBodySource(value)
{
  const bodySet = value?.backendBodySet ?? null;
  if (!bodySet) return null;

  if (bodySet.format !== BODY_SET_FORMAT)
  {
    throw new Error(
      `Carbon WebGPU body set declares format ${JSON.stringify(bodySet.format)}, expected ${BODY_SET_FORMAT}`
    );
  }

  // `unit.key` is a per-package ordinal ("unit0", "unit1", ...) and collides
  // across packages, so it is a lookup key here and a diagnostic label
  // elsewhere - never a cache key. `unit.sha256` is the shareable identity.
  const unitsByKey = new Map();
  for (const unit of Array.isArray(bodySet.passUnits) ? bodySet.passUnits : [])
  {
    if (typeof unit?.key !== "string" || !unit.key)
    {
      throw new Error("Carbon WebGPU body set contains a translation unit without a key");
    }
    if (typeof unit.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(unit.sha256))
    {
      throw new Error(`Carbon WebGPU translation unit ${unit.key} has no sha256 identity`);
    }
    if (unitsByKey.has(unit.key))
    {
      throw new Error(`Carbon WebGPU body set duplicates translation unit ${unit.key}`);
    }
    unitsByKey.set(unit.key, unit);
  }

  const bodiesByKey = new Map();
  for (const body of Array.isArray(bodySet.bodies) ? bodySet.bodies : [])
  {
    if (typeof body?.bodyKey !== "string" || !body.bodyKey)
    {
      throw new Error("Carbon WebGPU body set contains a body without a key");
    }
    if (bodiesByKey.has(body.bodyKey))
    {
      throw new Error(`Carbon WebGPU body set duplicates body ${body.bodyKey}`);
    }
    bodiesByKey.set(body.bodyKey, body);
  }

  // Which permutation resolves to which body is the container's decision, made
  // by Carbon's own alias dedupe and published in the permutation graph. The
  // engine reads that mapping; it never recomputes it from offsets, because a
  // second implementation of the alias rule is exactly how the wrong body
  // renders while every structural check still passes.
  const graph = value?.permutationGraph ?? null;
  const bodyKeyByPermutation = new Map();
  if (graph)
  {
    if (graph.format !== PERMUTATION_GRAPH_FORMAT)
    {
      throw new Error(
        `Carbon WebGPU permutation graph declares format ${JSON.stringify(graph.format)}, `
        + `expected ${PERMUTATION_GRAPH_FORMAT}`
      );
    }
    for (const variant of Array.isArray(graph.variants) ? graph.variants : [])
    {
      if (!Number.isInteger(variant?.permutationIndex))
      {
        throw new Error("Carbon WebGPU permutation graph contains a variant without a permutation index");
      }
      if (!bodiesByKey.has(variant.bodyKey))
      {
        throw new Error(
          `Carbon WebGPU permutation ${variant.permutationIndex} names body ${variant.bodyKey}, `
          + "which the body set does not carry"
        );
      }
      bodyKeyByPermutation.set(variant.permutationIndex, variant.bodyKey);
    }
  }

  const bodyCount = bodiesByKey.size;

  return Object.freeze({
    sourcePath: value.sourcePath,
    bodyCount,
    unitCount: unitsByKey.size,
    // Every permutation maps to a body; the body set stores only the unique
    // ones. Both counts are needed to state coverage honestly.
    permutationCount: bodyKeyByPermutation.size,

    /**
     * Resolve one permutation index to its translated passes.
     *
     * @param {number} permutationIndex Exact permutation index.
     * @returns {object} Resolved body record.
     */
    ResolveBody(permutationIndex)
    {
      const bodyKey = bodyKeyByPermutation.get(permutationIndex);

      // A missing mapping is never "this body has no passes". It is either "the
      // package carries no permutation graph" or "that index is out of range".
      // Both are ingestion faults worth naming separately from an unsupported
      // body, which is a success return.
      if (bodyKey === undefined)
      {
        throw new Error(
          `Carbon WebGPU permutation ${permutationIndex} resolved no backend body: the package has a body set of `
          + `${bodyCount} bodies over ${bodyKeyByPermutation.size} permutations, so either it carries no `
          + "permutation graph or that permutation index is out of range"
        );
      }

      const body = bodiesByKey.get(bodyKey);

      // An unsupported body is a success return carrying its reason. Surface
      // the reason; never crash on it and never silently skip it.
      if (body.status !== "translated")
      {
        return Object.freeze({
          permutationIndex,
          bodyKey,
          status: body.status,
          error: body.error ?? null,
          passes: Object.freeze([])
        });
      }

      // The units are shared by construction - one unit backs every body that
      // translated to the same programs - so clone before the package deep-
      // freezes anything, or freezing one body freezes another body's passes.
      const passes = (body.passes || []).map((pass) =>
      {
        const unit = unitsByKey.get(pass.unitKey);
        if (!unit)
        {
          throw new Error(
            `Carbon WebGPU body ${bodyKey} references missing translation unit ${pass.unitKey}`
          );
        }
        return Object.freeze({
          passKey: pass.passKey,
          unitKey: pass.unitKey,
          sha256: unit.sha256,
          wgslSetVersion: unit.wgslSetVersion,
          shaders: cloneJson(unit.shaders || []),
          layouts: cloneJson(unit.layouts || []),
          resourceTransforms: unit.resourceTransforms ? cloneJson(unit.resourceTransforms) : null
        });
      });

      return Object.freeze({
        permutationIndex,
        bodyKey,
        status: body.status,
        error: null,
        passes: Object.freeze(passes)
      });
    }
  });
}
