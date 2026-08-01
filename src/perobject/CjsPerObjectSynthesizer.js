// Realistic per-object data for Carbon space objects.
//
// The point of this module is that an engine implementer should not have to
// GUESS what a per-object constant buffer contains. It produces the same values
// Carbon's CPU side would produce, split honestly into two kinds:
//
//   - Derivable: values Carbon computes from the object and its SOF build -
//     the ship data lanes, the custom-mask (pattern projection) block, the clip
//     sphere maths, the ellipsoid. These are reproduced from the C++.
//   - Supplied: values that are scene or frame state - world transform, SH
//     lighting, screen size, camera-relative anything. These have no SOF answer,
//     so they take Carbon's documented neutral unless the caller passes one, and
//     the result reports which ones fell back.
//
// Emitted matrix values are already in Carbon's GPU-form transposed storage.
// The result therefore reports `matrices: "raw"`; pass that mode straight to
// `CjsPerObjectPacker.Pack` and do not transpose the matrices again.
//
// Carbon math is row-vector and runtime-utils (gl-matrix) is column-vector, so
// every composition here swaps operands relative to the C++.

import { mat4, vec3, vec4 } from "@carbonenginejs/runtime-utils";

import { CjsPerObjectLimits, perObjectStruct } from "./CjsPerObjectAbi.js";


/** Carbon's `EVE_SPACEOBJECT_DIRT_LEVEL_DEFAULT` (EveSpaceObject2.h:48). */
const DIRT_LEVEL_DEFAULT = 0;


/** Produces Carbon-faithful per-object values for space objects and their attachments. */
export class CjsPerObjectSynthesizer
{

    /** Fields the caller did not supply that fell back to a documented neutral. */
    #defaulted = [];

    /** The class that owns filling a custom-mask slot, normally EveCustomMask. */
    #customMask = null;

    /** Creates a synthesizer with an optional custom-mask implementation. */
    constructor(options = {})
    {
        this.#customMask = options.customMask ?? null;
    }

    /**
     * Carbon's neutral value bag for one struct, straight from the ABI catalog.
     *
     * A field absent from the result has NO neutral in Carbon and is allocator
     * garbage in the real engine until something writes it (`screenSize` and
     * `impactDataOffset` on a top-level EveSpaceObject2 are the live examples).
     */
    Neutral(structName)
    {
        const entry = perObjectStruct(structName);

        if (!entry)
        {
            return null;
        }

        const values = {};

        for (const field of entry.fields)
        {
            // A field with no default is deliberately allocator garbage in
            // Carbon, so it is deliberately absent here too.
            if (!field.default)
            {
                continue;
            }

            // Defaults are frozen in the catalog; copy so a caller mutating the
            // result cannot reach back into it.
            values[field.name] = field.elements > 1
                ? Array.from({ length: field.elements }, () => [ ...field.default ])
                : [ ...field.default ];
        }

        return values;
    }

    /**
     * The VS and PS per-object values for one EVE space object.
     *
     * Everything in `options` is optional; anything omitted takes Carbon's
     * neutral and is listed in the returned `defaulted` array. Angles, radii and
     * positions are in the object's own units - no scaling is applied.
     */
    SynthesizeSpaceObject(options = {})
    {
        this.#defaulted = [];

        const vs = this.#Scaffold("EveSpaceObjectVSData");
        const ps = this.#Scaffold("EveSpaceObjectPSData");

        const world = this.#Supplied(options, "worldTransform", mat4.create());
        const worldLast = options.worldTransformLast ?? world;
        const inverse = mat4.create();

        if (!mat4.invert(inverse, world))
        {
            // A singular world transform is a caller error, not something to
            // paper over: Carbon would hand the shader garbage. Identity is the
            // reproducible stand-in and it is reported.
            mat4.identity(inverse);
            this.#defaulted.push("invWorldTransform");
        }

        // Carbon stores these transposed (EveSpaceObject2.cpp:637-638), and so
        // does a per-object record - see carbon-math-conventions F1/F6. The
        // whole bag is therefore GPU-form, which is what `matrices` reports.
        vs.worldTransform = transposed(world);
        vs.worldTransformLast = transposed(worldLast);
        vs.invWorldTransform = transposed(inverse);
        ps.worldTransform = vs.worldTransform;
        ps.worldTransformLast = vs.worldTransformLast;
        ps.invWorldTransform = vs.invWorldTransform;

        const shipData = this.#ShipData(options);
        vs.shipData = shipData;
        ps.shipData = shipData;

        const clip = this.#Clip(options);
        vs.clipData = [...clip.center, clip.radiusSq];
        ps.clipSphereCenter = clip.center;
        ps.clipRadiusSq = [clip.radiusSq];
        ps.clipRadius2Sq = [clip.radius2Sq];
        ps.clipSphereFactor = [clip.factor];
        ps.clipSphereFactor2 = [clip.factor2];

        const ellipsoid = this.#Ellipsoid(options);
        vs.ellpsoidRadii = [...ellipsoid.radii, 0];
        vs.ellpsoidCenter = [...ellipsoid.center, 0];

        this.#CustomMasks(options.customMasks ?? [], vs, ps);

        if (options.shLighting)
        {
            ps.shLightingCoefficients = normalizeElements(options.shLighting, CjsPerObjectLimits.shCoefficientCount, 4);
        }
        else
        {
            this.#defaulted.push("shLightingCoefficients");
        }

        if (options.screenSize)
        {
            ps.screenSize = Array.from(options.screenSize);
        }
        else
        {
            // EveSpaceObject2 never writes screenSize; the child classes'
            // (0.5, 0.5, 0.5, 1) is the only documented value in Carbon.
            this.#defaulted.push("screenSize");
        }

        if (options.customData)
        {
            vs.customData = Array.from(options.customData);
            ps.customData = vs.customData;
        }

        if (options.boneOffsets)
        {
            vs.boneOffsets = Array.from(options.boneOffsets);
        }

        return {
            vs,
            ps,
            structs: { vs: "EveSpaceObjectVSData", ps: "EveSpaceObjectPSData" },
            // Matrices are already GPU-form; pass straight to Pack, whose
            // default matches. Never pack this as "logical".
            matrices: "raw",
            defaulted: [...new Set(this.#defaulted)]
        };
    }

    /**
     * The two custom-mask slots derived from a SOF build's pattern layers.
     *
     * Carbon sets `SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED` exactly when the DNA
     * has at least one pattern layer (EveSOF.cpp:621-650), and populates the
     * mask block from `SetupCustomMask` (EveSOF.cpp:2322-2362). So the option
     * and the mask block are two views of one fact, and this returns both.
     */
    SynthesizePatternLayers(layers = [])
    {
        const applied = layers
            .filter((layer) => layer && layer.enabled !== false)
            .slice(0, CjsPerObjectLimits.customMaskCount)
            .map((layer) => this.#Mask(layer));

        return {
            masks: applied,
            pptOption: layers.length > 0 ? "SOPPT_ENABLED" : "SOPPT_DISABLED",
            // A layer beyond the second is silently unrepresentable in Carbon
            // too - EVE_SPACEOBJECT_CUSTOWMASK_MAX is 2 - so say so rather than
            // dropping it quietly.
            dropped: Math.max(0, layers.length - CjsPerObjectLimits.customMaskCount)
        };
    }

    /** Produces the four Carbon ship-data lanes and records neutral fallbacks. */
    #ShipData(options)
    {
        // EveSpaceObject2.cpp:195 constructor, then EveShip2.cpp:285 (.x),
        // EveSpaceObject2.cpp:739 (.y), :744 (.z), :742 (.w). Not a bitfield -
        // four independent floats despite the name.
        const booster = options.boosterIntensity;
        const activation = options.activationStrength;
        const dirt = options.dirtLevel;
        const radius = options.boundingSphereRadius;

        if (booster === undefined)
        {
            this.#defaulted.push("shipData.x");
        }

        if (activation === undefined)
        {
            this.#defaulted.push("shipData.y");
        }

        if (radius === undefined)
        {
            this.#defaulted.push("shipData.w");
        }

        return [
            booster ?? 1,
            activation ?? 1,
            dirt ?? DIRT_LEVEL_DEFAULT,
            radius ?? 1
        ];
    }

    /** Produces Carbon's signed clip-sphere values. */
    #Clip(options)
    {
        // EveSpaceObject2.cpp:746-762, reproduced including the sign-carrying
        // squared radii the shader tests with sign() (RayTracingTest.cpp:679).
        const factor = options.clipSphereFactor ?? 0;
        const factor2 = options.clipSphereFactor2 ?? 0;
        const radius = options.boundingSphereRadius ?? 1;
        const modelScale = options.modelScale === 0 ? 1 : (options.modelScale ?? 1);
        const offsetCenter = options.clipSphereCenter ?? vec3.create();
        const boundsCenter = options.boundingSphereCenter ?? vec3.create();

        let normalizedRadius = radius / modelScale;
        const clipOffset = vec3.length(offsetCenter);
        normalizedRadius += clipOffset;

        const insidePercentage = Math.min(1, normalizedRadius === 0 ? 0 : clipOffset / normalizedRadius);
        const dissolve = factor * normalizedRadius * (1 + insidePercentage);
        const dissolve2 = factor2 * normalizedRadius * (1 + insidePercentage);

        const center = vec3.create();
        vec3.add(center, offsetCenter, boundsCenter);

        return {
            center: Array.from(center),
            radiusSq: sign(dissolve) * dissolve * dissolve,
            radius2Sq: sign(dissolve2) * dissolve2 * dissolve2,
            factor,
            factor2
        };
    }

    /** Produces the authored or neutral shape ellipsoid. */
    #Ellipsoid(options)
    {
        // EveSpaceObject2.cpp:641-644. Carbon's "not authored" sentinel is a
        // radius of (-1,-1,-1) (EveSpaceObject2.cpp:192); GetShapeEllipsoid
        // substitutes the generated shape in that case, so a caller with no
        // ellipsoid gets zero rather than the sentinel.
        if (!options.shapeEllipsoidRadius)
        {
            this.#defaulted.push("ellpsoidRadii");

            return { radii: [0, 0, 0], center: [0, 0, 0] };
        }

        return {
            radii: Array.from(options.shapeEllipsoidRadius),
            center: Array.from(options.shapeEllipsoidCenter ?? vec3.create())
        };
    }

    /**
     * Runs Carbon's mask driver loop (EveSpaceObject2.cpp:654-664): every slot
     * is either filled by its mask or zeroed, unconditionally.
     *
     * The FILL ITSELF IS NOT IMPLEMENTED HERE. A custom mask owns writing its
     * own slot into the parent's per-object structs, exactly as it does in
     * Carbon (EveCustomMask.cpp:66-93) and in runtime-trinity
     * (`EveCustomMask.FillPerObjectData` / `static ZeroPerObjectData`). This
     * package must not carry a second copy of that logic, so it calls the
     * protocol and nothing else.
     */
    #CustomMasks(masks, vs, ps)
    {
        // Carbon's zero path leaves the clamps at whatever the buffer held; the
        // synthesizer starts them at zero so a synthesized buffer is
        // reproducible, then lets each filled mask write its own two lanes.
        ps.customMaskClamps = Array.from(vec4.create());

        for (let slot = 0; slot < CjsPerObjectLimits.customMaskCount; slot++)
        {
            const mask = masks[slot] ? this.#Mask(masks[slot]) : null;

            if (mask)
            {
                mask.FillPerObjectData(slot, vs, ps);
                continue;
            }

            this.#zero(slot, vs, ps);
        }
    }

    /**
     * Coerces one entry of `customMasks` into something implementing the fill
     * protocol. An object that already implements it is used as-is, so a real
     * `EveCustomMask` can be passed straight through.
     */
    #Mask(mask)
    {
        if (typeof mask?.FillPerObjectData === "function")
        {
            return mask;
        }

        if (!this.#customMask)
        {
            throw new Error(
                "A plain custom-mask description needs the EveCustomMask class to fill it. Construct the "
                + "synthesizer with { customMask: EveCustomMask } from @carbonenginejs/runtime-trinity, or pass "
                + "mask objects that implement FillPerObjectData(index, vsData, psData)."
            );
        }

        const instance = new this.#customMask();

        instance.Setup(
            mask.position,
            mask.scaling,
            mask.rotation,
            mask.isMirrored,
            mask.clampU,
            mask.clampV,
            mask.materialSourceID ?? 0,
            mask.targetMaterials
        );

        return instance;
    }

    /**
     * Clears one mask slot. Delegates to the owning class when it is available;
     * otherwise takes the values straight from the ABI catalog, which records
     * the same identity-plus-zeros that `EveCustomMask::ZeroPerObjectData`
     * writes (EveCustomMask.cpp:88-93).
     */
    #zero(slot, vs, ps)
    {
        if (typeof this.#customMask?.ZeroPerObjectData === "function")
        {
            this.#customMask.ZeroPerObjectData(slot, vs, ps);

            return;
        }

        vs.customMaskMatrix[slot] = Array.from(mat4.create());
        vs.customMaskData[slot] = [0, 0, 0, 0];
        ps.customMaskMaterialIDs[slot] = [0, 0, 0, 0];
        ps.customMaskTargets[slot] = [0, 0, 0, 0];
    }

    /**
     * Every field of a struct, defaulted where Carbon documents a neutral and
     * ZEROED where it does not.
     *
     * Carbon would leave the undocumented ones as allocator garbage - `Neutral`
     * reports that honestly by omitting them. A synthesized buffer has to be
     * reproducible, so this fills them, which is a deliberate deviation and the
     * reason it is a separate method rather than a change to `Neutral`.
     */
    #Scaffold(structName)
    {
        const entry = perObjectStruct(structName);
        const values = this.Neutral(structName);

        for (const field of entry.fields)
        {
            if (values[field.name] !== undefined)
            {
                continue;
            }

            values[field.name] = field.elements > 1
                ? Array.from({ length: field.elements }, () => new Array(field.size).fill(0))
                : new Array(field.size).fill(0);
        }

        return values;
    }

    /** Returns one supplied value or records and returns its neutral fallback. */
    #Supplied(options, name, fallback)
    {
        if (options[name] === undefined || options[name] === null)
        {
            this.#defaulted.push(name);

            return fallback;
        }

        return options[name];
    }

}


/** GPU-form copy of a matrix - Carbon's `= Transpose(m)` staging fill. */
function transposed(value)
{
    const out = mat4.create();
    mat4.transpose(out, value);

    return Array.from(out);
}


/** Carbon's TriFloatSign: -1, 0 or 1. */
function sign(value)
{
    if (value > 0)
    {
        return 1;
    }

    return value < 0 ? -1 : 0;
}


/** Pads or truncates an array-of-vectors to the declared element count. */
function normalizeElements(value, elements, width)
{
    const result = [];

    for (let index = 0; index < elements; index++)
    {
        const element = value[index];

        result.push(element ? Array.from(element).slice(0, width) : new Array(width).fill(0));
    }

    return result;
}
