// Source: trinity/trinity/Tr2TextureArray.h
//   trinity/trinity/Tr2TextureArray.cpp

import { type } from "#schema";
import { CjsModel } from "#model";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2TextureArrayElement } from "./Tr2TextureArrayElement.js";

/** Describes a texture array's elements, dimensions, resource usage, upload increment, backing texture, and change callback. */
@type.define({ className: "Tr2TextureArray", family: "trinityCore", purpose: "Describes a texture array's elements, dimensions, resource usage, upload increment, backing texture, and change callback." })
export class Tr2TextureArray extends CjsModel
{

    /** m_elements (std::vector<ImageIO::HostBitmap>) */
    @type.list("ImageIO::HostBitmap")
    elements = [];

    /** m_texture (Tr2TextureAL) */
    @type.rawStruct("Tr2TextureAL")
    texture = null;

    /** m_dimensions (Tr2BitmapDimensions) */
    @type.rawStruct("Tr2BitmapDimensions")
    dimensions = null;

    /** m_onTextureChange (OnTextureChangeEvent) */
    @type.rawStruct("OnTextureChangeEvent")
    onTextureChange = null;

    /** m_increment (uint32_t) */
    @type.uint32
    increment = 16;

    /** m_cpuUsage (Tr2CpuUsage::Type - enum Tr2CpuUsage) */
    @type.int32
    @type.enum("Tr2CpuUsage")
    cpuUsage = 0;

    /** m_gpuUsage (Tr2GpuUsage::Type - enum Tr2GpuUsage) */
    @type.int32
    @type.enum("Tr2GpuUsage")
    gpuUsage = 16;

    #expectedDimensions = null;

    #listeners = [];

    #revision = 0;

    /**
     * Pins the dimension gate before the first element arrives
     * (Carbon SetExpectedElementDimensions).
     *
     * @param {object} dimensions Bitmap-shaped dimensions.
     */
    SetExpectedElementDimensions(dimensions)
    {
        this.#expectedDimensions = dimensions ? Tr2TextureArray.describe(dimensions) : null;
        if (!this.dimensions) this.dimensions = this.#expectedDimensions;
    }

    /**
     * Adds one element (Tr2TextureArray.cpp:18-79), CPU description side.
     *
     * Carbon's dimension gate REJECTS any bitmap whose type, format, width,
     * height, depth or mip count differs from the array's - silently, via an
     * invalid handle - which is exactly how a wrong-mip-count light profile
     * fails to register. Slot reuse is first-fit over released elements, the
     * element data is copied in, and the array size rounds up to a multiple
     * of `increment` (16). The GPU texture rebuild (cpp:66-72, CreateTexture)
     * is the abstraction layer's job; this side bumps the revision and
     * notifies listeners, matching m_onTextureChange.
     *
     * @param {object} bitmap Element payload: format, width, height,
     * mipCount, samples (or data), with optional dimension and depth.
     * @returns {Tr2TextureArrayElement} A valid handle, or an invalid one
     * when the payload is missing or incompatible.
     */
    AddElement(bitmap)
    {
        const payload = bitmap && (bitmap.samples || bitmap.data);
        if (!payload) return new Tr2TextureArrayElement();

        const described = Tr2TextureArray.describe(bitmap);
        const gate = this.dimensions || this.#expectedDimensions;
        if (gate && (
            gate.dimension !== described.dimension
            || gate.format !== described.format
            || gate.width !== described.width
            || gate.height !== described.height
            || gate.depth !== described.depth
            || gate.mipCount !== described.mipCount))
        {
            return new Tr2TextureArrayElement();
        }

        let index = this.elements.length;
        for (let i = 0; i < this.elements.length; i++)
        {
            if (this.elements[i] === null)
            {
                index = i;
                break;
            }
        }
        if (index === this.elements.length) this.elements.push(null);

        this.elements[index] = { ...bitmap, samples: payload.slice() };

        this.dimensions = {
            ...described,
            arraySize: Math.ceil(this.elements.length / this.increment) * this.increment
        };
        this.#revision += 1;
        for (const listener of this.#listeners) listener(this);

        return new Tr2TextureArrayElement(this, index);
    }

    /**
     * Frees one slice (cpp:127-130): the slot becomes reusable; dimensions
     * and array size are deliberately untouched, exactly as Carbon leaves
     * the vector sized and the slot invalid.
     *
     * @param {number} index Slice index.
     */
    RemoveElement(index)
    {
        if (index >= 0 && index < this.elements.length)
        {
            this.elements[index] = null;
            this.#revision += 1;
            for (const listener of this.#listeners) listener(this);
        }
    }

    /**
     * Registers a texture-change listener (Carbon's OnTextureChange event).
     *
     * @param {Function} listener Called with this array after each change.
     * @returns {Function} Unsubscribe.
     */
    OnTextureChange(listener)
    {
        this.#listeners.push(listener);
        return () =>
        {
            const at = this.#listeners.indexOf(listener);
            if (at !== -1) this.#listeners.splice(at, 1);
        };
    }

    /** Element payload at an index, or null for a released slot. */
    GetElement(index)
    {
        return this.elements[index] ?? null;
    }

    /** Live (non-released) element count. */
    GetElementCount()
    {
        let count = 0;
        for (const element of this.elements) if (element !== null) count += 1;
        return count;
    }

    /** Current dimensions, or null before the first element. */
    GetDimensions()
    {
        return this.dimensions;
    }

    /** Element width; 0 before the first element (Carbon cpp:101-104). */
    GetWidth()
    {
        return this.dimensions ? this.dimensions.width : 0;
    }

    /** Element height; 0 before the first element. */
    GetHeight()
    {
        return this.dimensions ? this.dimensions.height : 0;
    }

    /** Slice capacity rounded to the increment; 0 before the first element. */
    GetArraySize()
    {
        return this.dimensions ? this.dimensions.arraySize ?? 0 : 0;
    }

    /** Element pixel format, or null before the first element. */
    GetFormat()
    {
        return this.dimensions ? this.dimensions.format : null;
    }

    /** Element mip count; 0 before the first element. */
    GetMipCount()
    {
        return this.dimensions ? this.dimensions.mipCount : 0;
    }

    /** Monotonic change counter for AL-side re-upload decisions. */
    GetRevision()
    {
        return this.#revision;
    }

    /**
     * Normalizes a bitmap-shaped payload to the compared dimension keys.
     *
     * @param {object} bitmap Payload or dimensions object.
     * @returns {object} Comparable dimension description.
     */
    static describe(bitmap)
    {
        return {
            dimension: bitmap.dimension ?? "2d",
            format: bitmap.format ?? null,
            width: bitmap.width ?? 0,
            height: bitmap.height ?? 0,
            depth: bitmap.depth ?? 1,
            mipCount: bitmap.mipCount ?? 1
        };
    }

    static Tr2CpuUsage = Tr2CpuUsage;

    static Tr2GpuUsage = Tr2GpuUsage;

}
