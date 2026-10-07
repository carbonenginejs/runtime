// Source: trinity/shadercompiler/SymbolTable.h
// Source: trinity/shadercompiler/SymbolTable.cpp:32-44

import { InlineString } from "../InlineString.js";

/**
 * A `register(...)` binding: Carbon's `RegisterSpecifier`, copied by value.
 *
 * `registerType` is the lower-case register class as a one-character string
 * (`"b"`, `"t"`, `"s"`, `"u"`, `"c"`), or `""` where Carbon holds the char 0.
 * `shaderProfile` is the profile the binding applies to; the empty string
 * means every profile.
 */
export class RegisterSpecifier
{
    shaderProfile = new InlineString();

    registerType = "";

    registerNumber = 0;

    subComponent = 0;

    space = 0;

    explicitRegister = false;

    explicitSpace = false;

    /**
     * Returns a copy, as assigning a Carbon `RegisterSpecifier` copies it.
     *
     * @returns {RegisterSpecifier} An independent binding.
     */
    Copy()
    {
        const copy = new RegisterSpecifier();
        copy.shaderProfile = this.shaderProfile.Copy();
        copy.registerType = this.registerType;
        copy.registerNumber = this.registerNumber;
        copy.subComponent = this.subComponent;
        copy.space = this.space;
        copy.explicitRegister = this.explicitRegister;
        copy.explicitSpace = this.explicitSpace;
        return copy;
    }

    /**
     * Carbon's `RegisterSpecifier::Register`.
     *
     * @param {string} type Register class character.
     * @param {number} [index=-1] Register number.
     * @returns {RegisterSpecifier} An explicit binding with a null profile.
     */
    static register(type, index = -1)
    {
        const reg = new RegisterSpecifier();
        reg.shaderProfile = new InlineString();
        reg.registerType = type;
        reg.registerNumber = index;
        reg.subComponent = -1;
        reg.space = -1;
        reg.explicitRegister = true;
        reg.explicitSpace = false;
        return reg;
    }
}
