import { CjsSchema } from "#schema";
// Source: trinity/shadercompiler/EffectCompilerMetal.h:7-23

/**
 * Carbon's `MetalRegister`: a struct that only scopes its `Enum`, the
 * register-type characters the Metal compiler stores in a `RegisterSpecifier`
 * to mark Metal argument attributes. Not instantiated.
 */
export class MetalRegister
{
    /** Carbon's `MetalRegister::Enum`. */
    static Enum = Object.freeze({
        Invalid: "\0",
        StageIn: "i", // [[stage_in]]
        Attribute: "a", // [[attribute(#)]]
        CBuffer: "c", // [[CBUFFER(#)]]
        SRV: "b", // [[SRV(#)]]
        Texture: "t", // [[texture(#)]]
        Sampler: "s", // [[sampler(#)]]
        UAV: "u", // [[UAV(#)]], [[UAVT(#)]]
        ThreadGroup: "g", // [[threadgroup(#)]]
        User: "x", // [[user(...)]]
        System: "v" // [[position]], etc. see MetalSystemSemanticsType
    });
}

CjsSchema.blue.define(MetalRegister, {
    className: "MetalRegister"
});
