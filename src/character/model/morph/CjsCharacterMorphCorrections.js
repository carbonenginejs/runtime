/**
 * The engine that applies morph corrections: rules given as data, never held here. A correction is a setting with a
 * default, applied on top of the shipped morph data in memory; the shipped files are never changed.
 * The rules in force come from the character library (`CjsCharacterLibraryManager._morphCorrections`), read from
 * the defaults file `factory/defaults/morphCorrections.json`, which only the library loads.
 *
 * A rule names a model (resource path, compared without case), a morph target (a name pattern), and per mesh either
 * `mirror` (regions in which a vertex's offset blends towards its mirror partner's, mirrored across x; a region is a
 * sphere `center`/`inner`/`outer`, or `right`: `inner`/`outer` from the midline, the character's right being -x)
 * or `carry` (the mirrored mesh whose smoothed change a riding mesh takes). Base meshes, files and other morphs stay.
 *
 * Ours (no Carbon counterpart: Carbon bakes shipped morph data; `TriGrannyRes.SetMorphTargetOffsets` is our `@cjs`
 * addition). A deliberate extension: Carbon applies shipped morph data as it is.
 */
export class CjsCharacterMorphCorrections
{
    static className = "CjsCharacterMorphCorrections";



    /**
     * One mesh's corrected morph offsets, when a correction in force covers it.
     * @param {object} source The model's `TriGrannyRes` (mesh and morph names, `GetMorphTargetOffsets`).
     * @param {string} path The model's resource path.
     * @param {number} meshIndex The mesh.
     * @param {number} morphIndex The morph target.
     * @param {Record<string, object>} corrections The rules in force, by id (`CjsCharacterLibraryManager._morphCorrections`).
     * @returns {?{ position: Float32Array, normal: ?Float32Array, changed: number }} New offsets, or null when none applies.
     */
    static offsetsFor(source, path, meshIndex, morphIndex, corrections)
    {
        const name = source.GetMeshName(meshIndex), morphName = source.GetMeshMorphName(meshIndex, morphIndex);
        for (const correction of Object.values(corrections))
        {
            if (String(path).toLowerCase() !== correction.model.toLowerCase()) continue;
            const rule = correction.meshes[name];
            if (!rule || !new RegExp(correction.morph, "iu").test(morphName)) continue;
            const own = source.GetMorphTargetOffsets(meshIndex, morphIndex);
            const { parameters } = correction;
            if (rule.mirror) return CjsCharacterMorphCorrections.correctOffsets(own, rule.mirror, parameters);
            const skinIndex = Array.from({ length: source.GetMeshCount() }, (_, mesh) => source.GetMeshName(mesh)).indexOf(rule.carry);
            const skinMorph = Array.from({ length: source.GetMeshMorphCount(skinIndex) }, (_, morph) => source.GetMeshMorphName(skinIndex, morph))
                .findIndex(morph => new RegExp(correction.morph, "iu").test(morph));
            if (skinIndex === -1 || skinMorph === -1) throw new Error("Morph correction carries from a missing mesh or morph: " + rule.carry);
            const skin = source.GetMorphTargetOffsets(skinIndex, skinMorph);
            const repaired = CjsCharacterMorphCorrections.correctOffsets(skin, correction.meshes[rule.carry].mirror, parameters);
            return CjsCharacterMorphCorrections.carryOffsets(skin, repaired.position, own, parameters);
        }
        return null;
    }

    /**
     * 1 inside `inner`, 0 beyond `outer`, a smooth step between: distances from `center`, or, for a `right` region, how
     * far a vertex lies on the character's right of the midline (-x).
     * @param {object} region The region.
     * @param {number} x Position.
     * @param {number} y Position.
     * @param {number} z Position.
     * @returns {number} The weight.
     */
    static regionWeight(region, x, y, z)
    {
        const bounds = region.right ?? region;
        const distance = region.right ? -x : Math.hypot(x - region.center[0], y - region.center[1], z - region.center[2]);
        const t = region.right
            ? Math.min(1, Math.max(0, (distance - bounds.outer) / (bounds.inner - bounds.outer)))
            : Math.min(1, Math.max(0, (bounds.outer - distance) / (bounds.outer - bounds.inner)));
        return t * t * (3 - 2 * t);
    }

    /**
     * Finds each vertex's mirror partner.
     * @param {Float32Array} base Base positions.
     * @param {{ mirrorTolerance: number, cell: number }} parameters The rule's parameters.
     * @returns {Int32Array} The partner of each vertex, or -1 when none is within tolerance.
     */
    static findMirrorPartners(base, { mirrorTolerance, cell: size })
    {
        const count = base.length / 3, grid = new Map(), partners = new Int32Array(count).fill(-1);
        const cell = value => Math.round(value / size);
        for (let i = 0; i < count; i++)
        {
            const key = `${cell(base[i * 3])},${cell(base[i * 3 + 1])},${cell(base[i * 3 + 2])}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(i);
        }
        for (let i = 0; i < count; i++)
        {
            const x = -base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
            let best = mirrorTolerance;
            for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++)
            {
                for (const other of grid.get(`${cell(x) + a},${cell(y) + b},${cell(z) + c}`) ?? [])
                {
                    const distance = Math.hypot(base[other * 3] - x, base[other * 3 + 1] - y, base[other * 3 + 2] - z);
                    if (distance < best) { best = distance; partners[i] = other; }
                }
            }
        }
        return partners;
    }

    /**
     * A mesh's corrected offsets: inside its regions each vertex takes its mirror partner's offset, mirrored.
     * @param {{base: Float32Array, position: Float32Array, normal: ?Float32Array}} offsets The original data.
     * @param {object[]} regions The mesh's regions.
     * @param {{ mirrorTolerance: number, seamPrecision: number, cell: number }} parameters The rule's parameters.
     * @returns {{position: Float32Array, normal: ?Float32Array, changed: number}} New arrays; the input is not written.
     */
    static correctOffsets({ base, position, normal }, regions, parameters)
    {
        const partners = CjsCharacterMorphCorrections.findMirrorPartners(base, parameters), count = base.length / 3;
        const precision = parameters.seamPrecision;
        const correctedPosition = position.slice(), correctedNormal = normal ? normal.slice() : null;
        const seams = new Map();
        for (let i = 0; i < count; i++)
        {
            const key = `${Math.round(base[i * 3] * precision)},${Math.round(base[i * 3 + 1] * precision)},${Math.round(base[i * 3 + 2] * precision)}`;
            if (!seams.has(key)) seams.set(key, []);
            seams.get(key).push(i);
        }
        let changed = 0;
        for (const copies of seams.values())
        {
            const first = copies[0];
            const weight = Math.max(...regions.map(region => CjsCharacterMorphCorrections.regionWeight(region, base[first * 3], base[first * 3 + 1], base[first * 3 + 2])));
            // Every copy of a split vertex takes the same offset, so the seam cannot open.
            const source = copies.find(copy => partners[copy] !== -1);
            if (weight === 0 || source === undefined) continue;
            const partner = partners[source];
            for (const copy of copies)
            {
                for (let axis = 0; axis < 3; axis++)
                {
                    const sign = axis === 0 ? -1 : 1;
                    correctedPosition[copy * 3 + axis] = position[source * 3 + axis] * (1 - weight) + sign * position[partner * 3 + axis] * weight;
                    if (normal) correctedNormal[copy * 3 + axis] = normal[source * 3 + axis] * (1 - weight) + sign * normal[partner * 3 + axis] * weight;
                }
                changed++;
            }
        }
        return { position: correctedPosition, normal: correctedNormal, changed };
    }

    /**
     * Carries a skin's correction onto a mesh that rides it: each vertex takes a distance-weighted average of the
     * skin's change, so neighbouring lash points move together and the mesh keeps its shape.
     * @param {{base: Float32Array, position: Float32Array}} skin The skin's original data.
     * @param {Float32Array} corrected The skin's corrected position offsets.
     * @param {{base: Float32Array, position: Float32Array}} attached The mesh's original data.
     * @param {{ carrySmoothing: number }} parameters The rule's parameters.
     * @returns {{position: Float32Array, normal: null, changed: number}} New offsets; the shipped normals stay.
     */
    static carryOffsets(skin, corrected, attached, parameters)
    {
        const position = attached.position.slice();
        const skinCount = skin.base.length / 3, smoothing = parameters.carrySmoothing;
        const falloff = 2 * smoothing * smoothing;
        let changed = 0;
        for (let i = 0; i < position.length / 3; i++)
        {
            const x = attached.base[i * 3], y = attached.base[i * 3 + 1], z = attached.base[i * 3 + 2];
            let total = 0, dx = 0, dy = 0, dz = 0;
            for (let j = 0; j < skinCount; j++)
            {
                const ax = skin.base[j * 3] - x, ay = skin.base[j * 3 + 1] - y, az = skin.base[j * 3 + 2] - z;
                const squared = ax * ax + ay * ay + az * az;
                if (squared > falloff * 4) continue;
                const weight = Math.exp(-squared / falloff);
                total += weight;
                dx += weight * (corrected[j * 3] - skin.position[j * 3]);
                dy += weight * (corrected[j * 3 + 1] - skin.position[j * 3 + 1]);
                dz += weight * (corrected[j * 3 + 2] - skin.position[j * 3 + 2]);
            }
            if (total === 0 || (dx === 0 && dy === 0 && dz === 0)) continue;
            position[i * 3] += dx / total;
            position[i * 3 + 1] += dy / total;
            position[i * 3 + 2] += dz / total;
            changed++;
        }
        return { position, normal: null, changed };
    }
}
