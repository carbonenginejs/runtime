// Source: trinity/trinity/Tr2TextureArray.h
//   trinity/trinity/Tr2TextureArray.cpp

import { meta, type, blue } from "#schema";
import { Tr2Event } from "../Tr2Event.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { BitmapDimensions, HostBitmap } from "#imageio";
import { Tr2TextureArrayElement } from "./Tr2TextureArrayElement.js";
import "#consts/renderContext/resources";

/** Describes a texture array's elements, dimensions, resource usage, upload increment, backing texture, and change callback. */
@blue.define({ className: "Tr2TextureArray", purpose: "Describes a texture array's elements, dimensions, resource usage, upload increment, backing texture, and change callback." })
export class Tr2TextureArray
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
    onTextureChange = new Tr2Event();

    /** m_increment (uint32_t) */
    @type.uint32
    increment = 16;

    /** m_cpuUsage (Tr2CpuUsage::Type - enum Tr2CpuUsage) */
    @type.int32
    @type.enum("trinity.Tr2CpuUsage")
    cpuUsage = 0;

    /** m_gpuUsage (Tr2GpuUsage::Type - enum Tr2GpuUsage) */
    @type.int32
    @type.enum("trinity.Tr2GpuUsage")
    gpuUsage = 16;


    #revision = 0;

    /**
     * Pins the dimension gate before the first element arrives
     * (Tr2TextureArray.cpp:9-15): ignored once a texture exists.
     *
     * @param {BitmapDimensions} dimensions The dimensions every element must have.
     */
    SetExpectedElementDimensions(dimensions)
    {
        if (this.texture) return;
        this.dimensions = dimensions;
    }

    /**
     * Adds one element (Tr2TextureArray.cpp:18-79).
     *
     * Carbon's dimension gate REJECTS a bitmap whose type, format, width,
     * height, depth or true mip count differs from the array's - silently, with
     * an invalid handle - which is how a wrong-mip-count light profile fails to
     * register. Slots are reused first-fit over released elements, the bitmap
     * is copied in, and the array size rounds up to a multiple of `increment`.
     *
     * adapted: Carbon rebuilds the GPU texture here (`CreateTexture`,
     * cpp:66-72) and fires m_onTextureChange. Trinity cannot reach a device from
     * this class, so it bumps the revision and notifies listeners; the backend
     * rebuilds from the elements.
     *
     * @param {HostBitmap} bitmap The element's bitmap.
     * @returns {Tr2TextureArrayElement} A valid handle, or an invalid one.
     */
    AddElement(bitmap)
    {
        if (!bitmap || !bitmap.IsValid()) return new Tr2TextureArrayElement();

        const gate = this.dimensions;
        if (gate && (
            gate.GetType() !== bitmap.GetType()
            || gate.GetFormat() !== bitmap.GetFormat()
            || gate.GetWidth() !== bitmap.GetWidth()
            || gate.GetHeight() !== bitmap.GetHeight()
            || gate.GetDepth() !== bitmap.GetDepth()
            || gate.GetTrueMipCount() !== bitmap.GetTrueMipCount()))
        {
            return new Tr2TextureArrayElement();
        }

        let index = this.elements.length;
        for (let i = 0; i < this.elements.length; i++)
        {
            if (!this.elements[i].IsValid())
            {
                index = i;
                break;
            }
        }
        if (index === this.elements.length) this.elements.push(new HostBitmap());

        const element = this.elements[index];
        element.CreateFromBitmapDimensions(bitmap);
        element.GetRawData().set(bitmap.GetRawData());

        this.dimensions = new BitmapDimensions({
            type: bitmap.GetType(),
            format: bitmap.GetFormat(),
            width: bitmap.GetWidth(),
            height: bitmap.GetHeight(),
            depth: bitmap.GetDepth(),
            mipCount: bitmap.GetTrueMipCount(),
            arraySize: Math.ceil(this.elements.length / this.increment) * this.increment
        });

        this.#revision += 1;
        this.onTextureChange.Broadcast();
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
            this.elements[index] = new HostBitmap();
            this.#revision += 1;
            this.onTextureChange.Broadcast();
        }
    }

    /**
     * Carbon OnTextureChange (ITr2TextureProvider.h:16): the event fired when
     * the array's texture changes. Listeners register an owner and an unbound
     * method; the event holds owners weakly.
     *
     * @returns {Tr2Event} m_onTextureChange.
     */
    @meta.implemented
    OnTextureChange()
    {
        return this.onTextureChange;
    }

    /** An element's bitmap, or null for a released or missing slot. */
    GetElement(index)
    {
        const element = this.elements[index];
        return element && element.IsValid() ? element : null;
    }

    /**
     * Slots in the array, released ones included - Carbon returns
     * `m_elements.size()` (cpp:91-94).
     */
    GetElementCount()
    {
        return this.elements.length;
    }

    /** Current dimensions, or null before the first element. */
    GetDimensions()
    {
        return this.dimensions;
    }

    /** Element width; 0 before the first element (Carbon cpp:101-104). */
    GetWidth()
    {
        return this.dimensions ? this.dimensions.GetWidth() : 0;
    }

    /** Element height; 0 before the first element. */
    GetHeight()
    {
        return this.dimensions ? this.dimensions.GetHeight() : 0;
    }

    /** Slice capacity rounded to the increment; 0 before the first element. */
    GetArraySize()
    {
        return this.dimensions ? this.dimensions.GetArraySize() : 0;
    }

    /** Element pixel format, or null before the first element. */
    GetFormat()
    {
        return this.dimensions ? this.dimensions.GetFormat() : null;
    }

    /** Element mip count; 0 before the first element. */
    GetMipCount()
    {
        return this.dimensions ? this.dimensions.GetTrueMipCount() : 0;
    }

    /** Monotonic change counter for AL-side re-upload decisions. */
    GetRevision()
    {
        return this.#revision;
    }

    static Tr2CpuUsage = Tr2CpuUsage;

    static Tr2GpuUsage = Tr2GpuUsage;

}
