import { buildCmfFromShared } from "../../cmf/core/shared.js";
import { projectShared } from "./shared.js";

export { CMF_CLASS_KEYS } from "../../cmf/core/constants.js";
export { buildCmfFromShared };

function parsedLodName(name)
{
    const match = /^(.*?) LOD (\d+)$/u.exec(String(name ?? ""));
    return match ? { base: match[1], threshold: Number(match[2]) } : null;
}

/**
 * Reassemble Granny's separate `BaseName LOD <threshold>` meshes for CMF.
 *
 * Carbon publishes those siblings as LODs inside the unique unsuffixed base
 * mesh. Names without a unique exact base are left untouched; `_lowdetail`
 * resource paths are unrelated to this in-file convention.
 */
export function reassembleGr2Lods(root)
{
    const meshes = root?.meshes ?? [];
    const baseIndices = new Map();
    for (let index = 0; index < meshes.length; index++)
    {
        const name = meshes[index]?.name ?? "";
        if (parsedLodName(name)) continue;
        const indices = baseIndices.get(name) ?? [];
        indices.push(index);
        baseIndices.set(name, indices);
    }

    const siblings = new Map();
    for (let index = 0; index < meshes.length; index++)
    {
        const parsed = parsedLodName(meshes[index]?.name);
        if (!parsed || baseIndices.get(parsed.base)?.length !== 1) continue;
        const values = siblings.get(parsed.base) ?? [];
        values.push({ index, threshold: parsed.threshold, mesh: meshes[index] });
        siblings.set(parsed.base, values);
    }
    const combinable = new Set([ ...siblings ].filter(([, values ]) =>
        new Set(values.map(value => value.threshold)).size === values.length).map(([ name ]) => name));

    const oldToNew = new Array(meshes.length);
    const output = [];
    for (let index = 0; index < meshes.length; index++)
    {
        const mesh = meshes[index];
        const parsed = parsedLodName(mesh?.name);
        if (parsed && combinable.has(parsed.base))
        {
            // Its unique base emits the combined mesh.
            continue;
        }

        const group = siblings.get(mesh?.name ?? "") ?? [];
        const thresholds = new Set(group.map(value => value.threshold));
        const canCombine = combinable.has(mesh?.name ?? "") && group.length > 0 && thresholds.size === group.length;
        const newIndex = output.length;
        oldToNew[index] = newIndex;
        if (!canCombine)
        {
            output.push(mesh);
            continue;
        }

        const ordered = group.slice().sort((left, right) => right.threshold - left.threshold);
        output.push({
            ...mesh,
            lods: [
                { ...mesh, threshold: 0xffffffff },
                ...ordered.map(value => ({ ...value.mesh, threshold: value.threshold }))
            ]
        });
        for (const value of ordered) oldToNew[value.index] = newIndex;
    }

    const models = (root?.models ?? []).map(model =>
    {
        const seen = new Set();
        const meshBindings = [];
        for (const oldIndex of model.meshBindings ?? [])
        {
            const newIndex = oldIndex === -1 ? -1 : oldToNew[oldIndex];
            if (newIndex === undefined || seen.has(newIndex)) continue;
            seen.add(newIndex);
            meshBindings.push(newIndex);
        }
        return { ...model, meshBindings };
    });
    return { ...root, meshes: output, models };
}

/** Build a plain CMF graph directly from a parsed GR2 result. */
export function buildCmfFromRaw(raw)
{
    return buildCmfFromShared(reassembleGr2Lods(projectShared(raw.fileInfo, raw.version)));
}
