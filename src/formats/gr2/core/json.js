/**
 * GR2 JSON emitter.
 * @author cppctamber
 * `emitJson(fileInfo, version)` returns a plain object whose key order
 * mirrors the reader schema. Normalized integer values are dequantized with
 * float32 reciprocals, Real16 values are already converted by reader.js, and
 * non-finite floats are serialized as 0.
 */

const fr = Math.fround;

/**
 * Member type ids whose numeric values need conversion for GR2 JSON output.
 */
const MEMBER_TYPES = Object.freeze({
    Real32: 10, Int8: 11, UInt8: 12, BinormalInt8: 13, NormalUInt8: 14,
    Int16: 15, UInt16: 16, BinormalInt16: 17, NormalUInt16: 18,
    Int32: 19, UInt32: 20, Real16: 21
});
const T = MEMBER_TYPES;

/** Float32 reciprocal used to dequantize NormalUInt8 values. */
const INV255_VALUE = fr(1 / 255);

/** Float32 reciprocal used to dequantize NormalUInt16 values. */
const INV65535_VALUE = fr(1 / 65535);

/** Float32 reciprocal used to dequantize BinormalInt8 values. */
const INV127_VALUE = fr(1 / 127);

/** Float32 reciprocal used to dequantize BinormalInt16 values. */
const INV32767_VALUE = fr(1 / 32767);

const
    INV255 = INV255_VALUE,
    INV65535 = INV65535_VALUE,
    INV127 = INV127_VALUE,
    INV32767 = INV32767_VALUE;

/**
 * Node keys accepted by {@link emitJson}'s `options.classes` map.
 *
 * Each key names one GR2 JSON node shape; the mapped constructor is
 * instantiated with `new` and populated with that node's usual fields instead
 * of a plain object literal.
 */
export const CLASS_KEYS = Object.freeze([
    "Root", "Mesh", "BoneBinding", "IndexGroup", "MorphTarget", "Model",
    "Skeleton", "Bone", "Animation", "TrackGroup", "TransformTrack", "Curve"
]);

/**
 * Constructors used to hydrate GR2 JSON nodes as class instances.
 *
 * Every key is optional; node types with no matching constructor keep the
 * default plain-object shape. See {@link CLASS_KEYS} for valid keys.
 *
 * @typedef {{[key: string]: new () => object}} Gr2NodeClasses
 */

/**
 * Instantiate and populate a node class, or return the plain props unchanged.
 *
 * @param {Gr2NodeClasses} classes Opt-in node class map.
 * @param {string} key Node key to look up in `classes`.
 * @param {object} props Fields to populate onto the instance.
 * @returns {object} A populated class instance, or `props` when no
 * constructor is registered for `key`.
 */
function build(classes, key, props, hydrationOptions = {})
{
    const Ctor = classes[key];
    return Ctor ? populate(new Ctor(), props, hydrationOptions) : props;
}

function populate(instance, props, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsFormatGr2 class population requires classes to implement SetValues(values)");
    }
    instance.SetValues(props, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}

/**
 * Root object emitted in the GR2 JSON shape.
 *
 * @typedef {object} Gr2JsonRoot
 * @property {number} grannyFileFormatRevision Granny file format revision.
 * @property {string} grannyFileSource Original source filename, or an empty string.
 * @property {object[]} meshes Mesh records with deinterleaved vertex channels.
 * @property {object[]} models Model records with skeleton and mesh bindings.
 * @property {object[]} animations Animation records and transform tracks.
 */

/**
 * Convert a reflected numeric value to the float convention used by GR2 JSON.
 *
 * @param {number} v Raw reflected numeric value.
 * @param {number} memberType Granny member type id.
 * @returns {number} Converted and float32-rounded value.
 */
function convert(v, memberType)
{
    switch (memberType)
    {
        case T.NormalUInt8:
            return fr(v * INV255);

        case T.NormalUInt16:
            return fr(v * INV65535);

        case T.BinormalInt8:
            return fr(v * INV127);

        case T.BinormalInt16:
            return fr(v * INV32767);

        default:
            return fr(v);
    }
}

/**
 * Replace non-finite JSON numbers with zero.
 *
 * @param {number} v Candidate numeric value.
 * @returns {number} The original finite value, or zero.
 */
function sf(v) { return Number.isFinite(v) ? v : 0; }

/**
 * Copy and dequantize one vertex channel from reflected vertex objects.
 *
 * Missing Granny members return an empty channel.
 *
 * @param {object[]} vertices Reflected vertex array with non-enumerable type metadata.
 * @param {string} memberName Granny vertex member name to copy.
 * @param {number} destWidth Number of components in the emitted channel.
 * @returns {number[]} Flat deinterleaved channel values.
 */
function copyChannel(vertices, memberName, destWidth)
{
    const
        type = vertices.__type || [],
        m = type.find(x => x.name === memberName);
    if (!m) return [];
    const
        srcWidth = m.arrayWidth > 1 ? m.arrayWidth : 1,
        n = Math.min(srcWidth, destWidth),
        out = new Array(vertices.length * destWidth).fill(0);
    for (let i = 0; i < vertices.length; i++)
    {
        const
            raw = vertices[i][memberName],
            arr = Array.isArray(raw) ? raw : [ raw ],
            base = i * destWidth;
        for (let k = 0; k < n; k++)
        {
            out[base + k] = sf(convert(arr[k], m.type));
        }
    }
    return out;
}

const VERTEX_CHANNELS = Object.freeze([
    [ "position", "Position", 3 ],
    [ "blendIndice", "BoneIndices", 4 ],
    [ "tangent", "Tangent", 4 ],
    [ "normal", "Normal", 3 ],
    [ "texcoord0", "TextureCoordinates0", 2 ],
    [ "texcoord1", "TextureCoordinates1", 2 ],
    [ "binormal", "Binormal", 4 ],
    [ "blendWeight", "BoneWeights", 4 ]
]);

function emitVertexChannels(vertices)
{
    const channels = {};
    for (const [ name, memberName, width ] of VERTEX_CHANNELS)
    {
        channels[name] = copyChannel(vertices, memberName, width);
    }
    return channels;
}

/**
 * Flatten reflected scalar-array wrappers into plain JavaScript values.
 *
 * @param {ArrayLike<any>} a Reflected scalar array or already-flat array.
 * @returns {any[]} Plain scalar values.
 */
function scalarArray(a)
{
    if (!a || !a.length) return [];
    if (typeof a[0] === "object" && a[0] !== null)
    {
        const k = Object.keys(a[0])[0];
        return a.map(x => x[k]);
    }
    return a;
}

/**
 * Granny curve format ids emitted by the GR2 JSON curve serializer.
 */
const CURVE_FORMATS = Object.freeze({
    DaKeyframes32f: 0, DaK32fC32f: 1, DaIdentity: 2, DaConstant32f: 3,
    D3Constant32f: 4, D4Constant32f: 5, DaK16uC16u: 6, DaK8uC8u: 7,
    D4nK16uC15u: 8, D4nK8uC7u: 9, D3K16uC16u: 10, D3K8uC8u: 11,
    D9I1K16uC16u: 12, D9I3K16uC16u: 13, D9I1K8uC8u: 14, D9I3K8uC8u: 15,
    D3I1K32fC32f: 16, D3I1K16uC16u: 17, D3I1K8uC8u: 18
});
const F = CURVE_FORMATS;

/**
 * Locate the inline curve-data header inside a reflected curve-data object.
 *
 * @param {object} cd Reflected Granny curve-data object.
 * @returns {{Format: number, Degree: number}|null} Header object when present.
 */
function curveHeader(cd)
{
    for (const k of Object.keys(cd))
    {
        if (k.startsWith("CurveDataHeader")) return cd[k];
    }
    return null;
}

/**
 * Convert a reflected scalar array to float32-rounded finite numbers.
 *
 * @param {ArrayLike<any>} a Reflected scalar array.
 * @returns {number[]} Float array.
 */
function farr(a) { return scalarArray(a).map(x => sf(fr(x))); }

/**
 * Convert a reflected scalar array to unsigned 32-bit integer values.
 *
 * @param {ArrayLike<any>} a Reflected scalar array.
 * @returns {number[]} Unsigned integer array.
 */
function uarr(a) { return scalarArray(a).map(x => x >>> 0); }

/**
 * Emit one Granny Curve2 object in GR2 JSON form.
 *
 * @param {object} curve2 Reflected Granny curve object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Compact curve record with format-specific fields.
 */
function emitCurve(curve2, classes = {})
{
    const cd = curve2 && curve2.CurveData;
    if (!cd) return build(classes, "Curve", { format: 0, degree: 0, error: "no curve data" });
    const
        h = curveHeader(cd) || { Format: 0, Degree: 0 },
        format = h.Format,
        degree = h.Degree,
        o = { format, degree };
    switch (format)
    {
        case F.DaIdentity:
            break;

        case F.DaKeyframes32f:
            o.dimension = cd.Dimension;
            o.controls = farr(cd.Controls);
            break;

        case F.DaConstant32f:
            o.controls = farr(cd.Controls);
            break;

        case F.D3Constant32f:
            o.controls = (cd.Controls || [ 0, 0, 0 ]).slice(0, 3).map(x => sf(fr(x)));
            break;

        case F.D4Constant32f:
            o.controls = (cd.Controls || [ 0, 0, 0, 0 ]).slice(0, 4).map(x => sf(fr(x)));
            break;

        case F.DaK32fC32f:
            o.knots = farr(cd.Knots);
            o.controls = farr(cd.Controls);
            break;

        case F.DaK16uC16u:
        case F.DaK8uC8u:
            o.oneOverKnotScaleTrunc = cd.OneOverKnotScaleTrunc;
            o.controlScaleOffsets = farr(cd.ControlScaleOffsets);
            o.knotsControls = uarr(cd.KnotsControls);
            break;

        case F.D4nK16uC15u:
        case F.D4nK8uC7u:
            o.scaleOffsetTableEntries = cd.ScaleOffsetTableEntries;
            o.oneOverKnotScale = sf(fr(cd.OneOverKnotScale));
            o.knotsControls = uarr(cd.KnotsControls);
            break;

        case F.D3K16uC16u:
        case F.D3K8uC8u:
        case F.D3I1K16uC16u:
        case F.D3I1K8uC8u:
        case F.D9I3K16uC16u:
        case F.D9I3K8uC8u:
            o.oneOverKnotScaleTrunc = cd.OneOverKnotScaleTrunc;
            o.controlScales = (cd.ControlScales || [ 0, 0, 0 ]).map(x => sf(fr(x)));
            o.controlOffsets = (cd.ControlOffsets || [ 0, 0, 0 ]).map(x => sf(fr(x)));
            o.knotsControls = uarr(cd.KnotsControls);
            break;

        case F.D3I1K32fC32f:
            o.controlScales = (cd.ControlScales || [ 0, 0, 0 ]).map(x => sf(fr(x)));
            o.controlOffsets = (cd.ControlOffsets || [ 0, 0, 0 ]).map(x => sf(fr(x)));
            o.knotsControls = farr(cd.KnotsControls);
            break;

        case F.D9I1K16uC16u:
        case F.D9I1K8uC8u:
            o.oneOverKnotScaleTrunc = cd.OneOverKnotScaleTrunc;
            o.controlScales = [ sf(fr(cd.ControlScale)) ];
            o.controlOffsets = [ sf(fr(cd.ControlOffset)) ];
            o.knotsControls = uarr(cd.KnotsControls);
            break;

        default:
            o.error = `Unknown format ${format}`;
    }
    return build(classes, "Curve", o);
}

/**
 * Convert arbitrary reflected variant data to JSON-safe plain values.
 *
 * @param {any} v Reflected variant value.
 * @returns {JsonValue} JSON-compatible value.
 */
function emitVariant(v)
{
    if (v === null || v === undefined) return null;
    if (Array.isArray(v)) return v.map(emitVariant);
    if (typeof v === "object")
    {
        const o = {};
        for (const k of Object.keys(v))
        {
            o[k] = emitVariant(v[k]);
        }
        return o;
    }
    if (typeof v === "number") return Number.isInteger(v) ? v : sf(fr(v));
    return v;
}

/**
 * Attach converted extended data when the reflected variant is present.
 *
 * @param {object} target Emitted GR2 JSON object to mutate.
 * @param {object|null|undefined} ext Reflected extended-data variant.
 * @returns {void}
 */
function addExtendedData(target, ext)
{
    if (ext !== null && ext !== undefined && typeof ext === "object")
    {
        target.extendedData = emitVariant(ext);
    }
}

/**
 * Emit one reflected Granny morph target (blend shape) in GR2 JSON shape.
 *
 * Morph target vertex data uses the same deinterleaved channel layout as a
 * mesh's primary vertex data.
 *
 * @param {object} mt Reflected Granny `granny_morph_target` object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted morph-target record.
 */
function emitMorphTarget(mt, classes = {})
{
    const
        vd = mt.VertexData,
        verts = (vd && vd.Vertices) || [];
    return build(classes, "MorphTarget", {
        name: mt.ScalarName ?? "",
        dataIsDeltas: !!mt.DataIsDeltas,
        vertex: emitVertexChannels(verts)
    });
}

function mappedAnnotationRows(set, vertexCount)
{
    const
        annotations = set.VertexAnnotations || [],
        map = scalarArray(set.VertexAnnotationIndices),
        rows = [],
        vertexIndices = [];

    if (set.IndicesMapFromVertexToAnnotation)
    {
        for (let vertexIndex = 0; vertexIndex < Math.min(map.length, vertexCount); vertexIndex++)
        {
            const annotationIndex = map[vertexIndex];
            if (!Number.isInteger(annotationIndex) || annotationIndex < 0 || annotationIndex >= annotations.length) continue;
            rows.push(annotations[annotationIndex]);
            vertexIndices.push(vertexIndex);
        }
    }
    else
    {
        const count = map.length ? Math.min(map.length, annotations.length) : annotations.length;
        for (let annotationIndex = 0; annotationIndex < count; annotationIndex++)
        {
            const vertexIndex = map.length ? map[annotationIndex] : annotationIndex;
            if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= vertexCount) continue;
            rows.push(annotations[annotationIndex]);
            vertexIndices.push(vertexIndex);
        }
    }

    Object.defineProperty(rows, "__type", {
        value: annotations.__type || [],
        configurable: true
    });

    const identity = rows.length === vertexCount && vertexIndices.every((value, index) => value === index);
    return { rows, vertexIndices: identity ? null : vertexIndices };
}

function emitVertexAnnotationTarget(set, vertexCount, classes = {})
{
    if (!set || !set.VertexAnnotations?.length) return null;

    const mapped = mappedAnnotationRows(set, vertexCount);
    if (!mapped.rows.length) return null;

    const target = {
        name: set.Name ?? "",
        dataIsDeltas: true,
        vertex: emitVertexChannels(mapped.rows)
    };
    if (mapped.vertexIndices) target.vertexIndices = mapped.vertexIndices;
    return build(classes, "MorphTarget", target);
}

/**
 * Emit a reflected Granny mesh in GR2 JSON shape.
 *
 * @param {object} mesh Reflected Granny mesh object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted mesh record.
 */
function emitMesh(mesh, classes = {})
{
    const o = {};
    o.name = mesh.Name ?? "";
    o.minBounds = [ 0, 0, 0 ];
    o.maxBounds = [ 0, 0, 0 ];

    o.boneBindings = (mesh.BoneBindings || []).map(bb => build(classes, "BoneBinding", {
        name: bb.BoneName ?? "",
        minBounds: (bb.OBBMin || [ 0, 0, 0 ]).map(x => sf(fr(x))),
        maxBounds: (bb.OBBMax || [ 0, 0, 0 ]).map(x => sf(fr(x)))
    }));

    const
        vd = mesh.PrimaryVertexData,
        verts = (vd && vd.Vertices) || [];
    o.vertex = emitVertexChannels(verts);
    o.morphTargets = (mesh.MorphTargets || []).map(mt => emitMorphTarget(mt, classes));
    o.morphTargets.push(...(vd?.VertexAnnotationSets || [])
        .map(set => emitVertexAnnotationTarget(set, verts.length, classes))
        .filter(Boolean));

    const
        topo = mesh.PrimaryTopology || {},
        i32arr = scalarArray(topo.Indices),
        i16arr = scalarArray(topo.Indices16),
        groups = topo.Groups || [];
    o.indices = [];
    let indices = null, bpi = 0;
    if (i32arr.length) { indices = i32arr; bpi = 4; }
    else if (i16arr.length) { indices = i16arr.map(x => x & 0xffff); bpi = 2; }
    if (indices)
    {
        for (const g of groups)
        {
            const
                faces = new Array(g.TriCount * 3),
                start = g.TriFirst * 3;
            for (let i = 0; i < g.TriCount * 3; i++)
            {
                faces[i] = indices[start + i] >>> 0;
            }
            o.indices.push(build(classes, "IndexGroup", {
                name: `area_${g.MaterialIndex}`,
                bytesPerIndex: bpi,
                faces
            }));
        }
    }
    return build(classes, "Mesh", o);
}

/**
 * Emit a reflected Granny skeleton bone in GR2 JSON shape.
 *
 * @param {object} bone Reflected Granny bone object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted bone record.
 */
function emitBone(bone, classes = {})
{
    const
        t = bone.LocalTransform || bone.Transform ||
            { flags: 0, position: [ 0, 0, 0 ], orientation: [ 0, 0, 0, 1 ], scaleShear: [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ] },
        o = {};
    o.name = bone.Name ?? "";
    o.parentIndex = bone.ParentIndex | 0;
    o.flag = t.flags;
    if (t.flags & 1) o.position = t.position.map(x => sf(fr(x)));
    if (t.flags & 2) o.orientation = t.orientation.map(x => sf(fr(x)));
    if (t.flags & 4) o.scaleShear = t.scaleShear.map(x => sf(fr(x)));
    addExtendedData(o, bone.ExtendedData);
    return build(classes, "Bone", o);
}

/**
 * Emit a reflected Granny skeleton in GR2 JSON shape.
 *
 * @param {object|null} skel Reflected Granny skeleton object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted skeleton record.
 */
function emitSkeleton(skel, classes = {})
{
    const o = {};
    o.name = skel ? (skel.Name ?? "") : "";
    o.bones = skel ? (skel.Bones || []).map(b => emitBone(b, classes)) : [];
    if (skel) addExtendedData(o, skel.ExtendedData);
    return build(classes, "Skeleton", o);
}

/**
 * Emit a reflected Granny model in GR2 JSON shape.
 *
 * @param {object} model Reflected Granny model object.
 * @param {object} fileInfo Root reflected Granny file-info object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted model record.
 */
function emitModel(model, fileInfo, classes = {})
{
    const o = {};
    o.name = model.Name ?? "";
    o.skeleton = emitSkeleton(model.Skeleton, classes);
    const meshes = fileInfo.Meshes || [];
    o.meshBindings = (model.MeshBindings || []).map(mb =>
    {
        const idx = meshes.indexOf(mb && mb.Mesh);
        return idx;
    });
    addExtendedData(o, model.ExtendedData);
    return build(classes, "Model", o);
}

/**
 * Emit a reflected Granny transform track in GR2 JSON shape.
 *
 * @param {object} tt Reflected Granny transform-track object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted transform-track record.
 */
function emitTransformTrack(tt, classes = {})
{
    return build(classes, "TransformTrack", {
        name: tt.Name ?? "",
        flags: tt.Flags | 0,
        orientation: emitCurve(tt.OrientationCurve, classes),
        position: emitCurve(tt.PositionCurve, classes),
        scaleShear: emitCurve(tt.ScaleShearCurve, classes)
    });
}

/**
 * Emit a reflected Granny track group in GR2 JSON shape.
 *
 * @param {object} tg Reflected Granny track-group object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted track-group record.
 */
function emitTrackGroup(tg, classes = {})
{
    return build(classes, "TrackGroup", {
        name: tg.Name ?? "",
        transformTracks: (tg.TransformTracks || []).map(tt => emitTransformTrack(tt, classes))
    });
}

/**
 * Emit a reflected Granny animation in GR2 JSON shape.
 *
 * @param {object} anim Reflected Granny animation object.
 * @param {Gr2NodeClasses} [classes] Opt-in node class map.
 * @returns {object} Emitted animation record.
 */
function emitAnimation(anim, classes = {})
{
    const o = {};
    o.name = anim.Name ?? "";
    o.duration = sf(fr(anim.Duration));
    o.timeStep = sf(fr(anim.TimeStep));
    o.oversampling = sf(fr(anim.Oversampling));
    o.defaultLoopCount = anim.DefaultLoopCount | 0;
    o.flags = anim.Flags | 0;
    o.trackGroups = (anim.TrackGroups || []).filter(t => t).map(tg => emitTrackGroup(tg, classes));
    addExtendedData(o, anim.ExtendedData);
    return build(classes, "Animation", o);
}

/**
 * Convert a reflected `granny_file_info` graph into a GR2 JSON object.
 *
 * The key order and numeric conversion rules are stable so downstream tools can
 * compare emitted data.
 *
 * When `options.classes` is given, matching node types are instantiated and
 * populated as class instances instead of plain object literals; an opt-in
 * alternative to walking the returned JSON into application-specific classes
 * by hand. See {@link CLASS_KEYS} for the recognized keys.
 *
 * @param {object} fileInfo Reflected `granny_file_info` object from `reader.js`.
 * @param {number} version Granny file format revision.
 * @param {object} [options] Emission options.
 * @param {Gr2NodeClasses} [options.classes] Opt-in node class map.
 * @returns {Gr2JsonRoot} Plain JSON-compatible `GR2 JSON` object, or a
 * populated `classes.Root` instance when provided.
 */
export function emitJson(fileInfo, version, options = {})
{
    const { classes = {}, ...hydrationOptions } = options;
    return build(classes, "Root", {
        grannyFileFormatRevision: version | 0,
        grannyFileSource: fileInfo.FromFileName ?? "",
        meshes: (fileInfo.Meshes || []).filter(m => m).map(m => emitMesh(m, classes)),
        models: (fileInfo.Models || []).filter(m => m).map(m => emitModel(m, fileInfo, classes)),
        animations: (fileInfo.Animations || []).filter(a => a).map(a => emitAnimation(a, classes))
    }, hydrationOptions);
}
