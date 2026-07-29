import { WebglReadError } from "../errors.js";

const COMPONENTS = [ "x", "y", "z", "w" ];
const COMPONENT_INDEX = { x: 0, y: 1, z: 2, w: 3 };
const VEC_TYPE_BY_KIND = {
    float: [ "float", "vec2", "vec3", "vec4" ],
    int: [ "int", "ivec2", "ivec3", "ivec4" ],
    uint: [ "uint", "uvec2", "uvec3", "uvec4" ]
};
const BITCAST_FROM_FLOAT = { int: "floatBitsToInt", uint: "floatBitsToUint" };
const BITCAST_TO_FLOAT = { int: "intBitsToFloat", uint: "uintBitsToFloat" };

/**
 * Operand types that resolve to a special GLSL built-in instead of a register.
 */
const SPECIAL_OPERAND_NAMES = {
    12: "gl_FragDepth",
    38: "gl_FragDepth",
    39: "gl_FragDepth"
};

/**
 * Formats decoded DXBC operands as GLSL ES 3.00 expressions and assignments.
 *
 * Type policy: every register file is stored as float `vec4`s. Integer and
 * unsigned reads/writes bitcast at the use site (`floatBitsToInt` family),
 * mirroring HLSLcc's lowering when reflection-driven type analysis is
 * unavailable — which is always true for this stripped-DXBC corpus.
 *
 * Register naming defaults to the fork's register-stable ABI: `r#` temps,
 * `v#`/`o#` stage IO, `cb#.data[i]` constant buffers, `t#`/`s#` resources.
 */
export class DxbcGlslOperandFormatter
{
    /**
   * @param {object} [options] Naming overrides.
   * @param {object} [options.names] Partial override of the register-name builders.
   */
    constructor(options = {})
    {
        this.componentMap = options.componentMap || null;
        // Map of vertex-input register index -> "int"|"uint" for inputs whose
        // ISGN component type is integer but whose GLSL declaration was
        // float-lowered. Integer reads of these VALUE-convert (int(attr)), not
        // bitcast (floatBitsToInt(attr)) - ccpwgl uploads them as plain float
        // values, not integer bit patterns (see DxbcGlslEmitter._declareVertexInput).
        this.integerInputs = options.integerInputs || null;
        this.names = {
            temp: (index) => `r${index}`,
            indexableTemp: (index) => `x${index}`,
            input: (index) => `v${index}`,
            output: (index) => `o${index}`,
            constantBuffer: (slot) => `cb${slot}`,
            constantBufferMember: "data",
            resource: (index) => `t${index}`,
            sampler: (index) => `s${index}`,
            uav: (index) => `u${index}`,
            // Compute-stage pseudo-registers (map-style lowering): fixed names, one
            // instance per shader, independent of any register index.
            threadId: () => "vThreadID",
            threadGroupId: () => "vThreadGroupID",
            threadIdInGroup: () => "vThreadIDInGroup",
            threadIdInGroupFlattened: () => "vThreadIDInGroupFlattened",
            immediateConstantBuffer: "icb",
            ...options.names
        };
    }

    /**
   * Formats a source operand as a typed GLSL expression.
   *
   * @param {object} operand Decoded operand.
   * @param {object} [options] Formatting context.
   * @param {string} [options.destMask] Destination write mask driving swizzle selection.
   * @param {"float"|"int"|"uint"} [options.as] Type the consuming instruction reads.
   * @returns {string} GLSL expression.
   */
    sourceExpression(operand, options = {})
    {
        const destMask = options.destMask || "xyzw";
        const as = options.as || "float";

        if (operand.type === 4)
        {
            return this._immediateExpression(operand, destMask, as);
        }
        if (operand.type === 5)
        {
            throw new WebglReadError("64-bit immediates are not supported by the WebGL2 emitter", {
                operandType: operand.typeName
            });
        }

        const suffix = this._swizzleSuffix(operand, destMask);
        let expression = this.registerReference(operand) + suffix;
        if (as !== "float")
        {
            const integerInputKind = operand.type === 1 && this.integerInputs
                ? this.integerInputs.get(operand.registerIndex)
                : undefined;

            if (integerInputKind)
            {
                // Float-lowered integer vertex attribute (e.g. BLENDINDICES):
                // the register holds the value (3.0), not the bit pattern of 3,
                // so convert rather than bitcast (which would read garbage).
                const width = suffix ? suffix.length - 1 : 4;
                expression = `${VEC_TYPE_BY_KIND[as][width - 1]}(${expression})`;
            }
            else
            {
                expression = `${BITCAST_FROM_FLOAT[as]}(${expression})`;
            }
        }
        if (operand.modifierName === "neg")
        {
            expression = `(-${expression})`;
        }
        else if (operand.modifierName === "abs")
        {
            expression = `abs(${expression})`;
        }
        else if (operand.modifierName === "absneg")
        {
            expression = `(-abs(${expression}))`;
        }
        return expression;
    }

    /**
   * Remaps register-space component letters into an operand's declared-variable
   * component space (an input packed at `.z` of its register but declared as a
   * scalar `float` reads without any suffix; one packed at `.zw` and declared
   * `vec2` reads `.xy`).
   *
   * @param {object} operand Decoded operand.
   * @param {string} chars Register-space component letters.
   * @returns {string} Declared-space component letters ("" for scalar variables).
   */
    remapComponents(operand, chars)
    {
        const declared = this.componentMap ? this.componentMap(operand) : null;
        if (!declared || declared === "xyzw")
        {
            return chars;
        }
        if (declared.length === 1)
        {
            return "";
        }
        return [ ...chars ]
            .map((component) =>
            {
                const index = declared.indexOf(component);
                return COMPONENTS[index >= 0 ? index : 0];
            })
            .join("");
    }

    /**
   * Computes how many components a formatted source expression yields, after
   * declared-variable remapping (a swizzle over a scalar-declared input reads
   * as width 1 regardless of the requested mask width).
   *
   * @param {object} operand Decoded operand.
   * @param {string} [destMask] Destination write mask driving swizzle selection.
   * @returns {number} Component count of the emitted expression.
   */
    expressionWidth(operand, destMask = "xyzw")
    {
        if (operand.type === 4)
        {
            return operand.componentCount === 1 ? 1 : destMask.length;
        }
        if (operand.componentCount < 4 || operand.selectionModeName === "select1")
        {
            return 1;
        }
        let selected = destMask;
        if (operand.selectionModeName === "swizzle")
        {
            selected = [ ...destMask ].map((component) => operand.swizzle[COMPONENT_INDEX[component]]).join("");
        }
        else if (operand.selectionModeName === "mask" && operand.mask && operand.mask !== "xyzw")
        {
            selected = operand.mask;
        }
        const remapped = this.remapComponents(operand, selected);
        return remapped === "" ? 1 : remapped.length;
    }

    /**
   * Resolves a destination operand to its register reference and write masks.
   *
   * @param {object} operand Decoded destination operand.
   * @returns {{ref:string,mask:string,registerMask:string}|null} Target with the
   *   declared-space display mask and the register-space mask, or null for the
   *   `null` register.
   */
    destination(operand)
    {
        if (operand.type === 13)
        {
            return null;
        }
        if (SPECIAL_OPERAND_NAMES[operand.type])
        {
            return { ref: SPECIAL_OPERAND_NAMES[operand.type], mask: "", registerMask: operand.mask || "xyzw" };
        }
        const registerMask = operand.mask || "";
        return {
            ref: this.registerReference(operand),
            mask: this.remapComponents(operand, registerMask),
            registerMask
        };
    }

    /**
   * Builds a full assignment statement for a destination operand.
   *
   * @param {object} destOperand Decoded destination operand.
   * @param {string} valueExpression GLSL expression producing the value.
   * @param {object} [options] Assignment context.
   * @param {boolean} [options.saturate] Wrap the value in `clamp(v, 0.0, 1.0)`.
   * @param {"float"|"int"|"uint"} [options.as] Type of `valueExpression`; non-float
   *   values are bitcast back into the float register storage.
   * @returns {string|null} GLSL statement, or null when the destination is `null`.
   */
    assignment(destOperand, valueExpression, options = {})
    {
        const target = this.destination(destOperand);
        if (!target)
        {
            return null;
        }
        let value = valueExpression;
        const as = options.as || "float";
        if (as !== "float")
        {
            value = `${BITCAST_TO_FLOAT[as]}(${value})`;
        }
        if (options.saturate)
        {
            value = `clamp(${value}, 0.0, 1.0)`;
        }
        const mask = target.mask ? `.${target.mask}` : "";
        return `${target.ref}${mask} = ${value};`;
    }

    /**
   * Resolves an operand's register reference without swizzle or casts.
   *
   * @param {object} operand Decoded operand.
   * @returns {string} GLSL lvalue such as `r0`, `cb3.data[26]`, or `t0`.
   */
    registerReference(operand)
    {
        const indices = operand.indices;
        switch (operand.type)
        {
            case 0:
                return this.names.temp(this._immediateIndex(operand, 0));
            case 1:
                if (indices.length !== 1)
                {
                    throw new WebglReadError("Multi-dimensional inputs are not supported by the WebGL2 emitter", {
                        operandType: operand.typeName,
                        dimensions: indices.length
                    });
                }
                return this.names.input(this._immediateIndex(operand, 0));
            case 2:
                return this.names.output(this._immediateIndex(operand, 0));
            case 3:
                return `${this.names.indexableTemp(this._immediateIndex(operand, 0))}[${this._indexExpression(operand, 1)}]`;
            case 6:
                return this.names.sampler(this._immediateIndex(operand, 0));
            case 7:
                return this.names.resource(this._immediateIndex(operand, 0));
            case 8: {
                const member = this.names.constantBufferMember;
                const base = this.names.constantBuffer(this._immediateIndex(operand, 0));
                return `${base}${member ? `.${member}` : ""}[${this._indexExpression(operand, 1)}]`;
            }
            case 9:
                return `${this.names.immediateConstantBuffer}[${this._indexExpression(operand, 0)}]`;
            case 30:
                return this.names.uav(this._immediateIndex(operand, 0));
            case 32:
                return this.names.threadId();
            case 33:
                return this.names.threadGroupId();
            case 34:
                return this.names.threadIdInGroup();
            case 36:
                return this.names.threadIdInGroupFlattened();
            default:
                if (SPECIAL_OPERAND_NAMES[operand.type])
                {
                    return SPECIAL_OPERAND_NAMES[operand.type];
                }
                throw new WebglReadError("Operand type is not supported by the WebGL2 emitter", {
                    operandType: operand.typeName
                });
        }
    }

    /**
   * Formats an immediate32 operand as a scalar or vector literal.
   *
   * @param {object} operand Decoded immediate operand.
   * @param {string} destMask Destination write mask.
   * @param {"float"|"int"|"uint"} as Literal type.
   * @returns {string} GLSL literal expression.
   * @private
   */
    _immediateExpression(operand, destMask, as)
    {
        const literals = operand.immediateValues.map((value) => this._literal(value, as));
        if (operand.componentCount === 1)
        {
            return literals[0];
        }
        const selected = [ ...destMask ].map((component) =>
        {
            const slot = COMPONENT_INDEX[component];
            if (slot === undefined || slot >= literals.length)
            {
                throw new WebglReadError("Immediate component selection is out of range", {
                    destMask,
                    component
                });
            }
            return literals[slot];
        });
        if (selected.length === 1)
        {
            return selected[0];
        }
        return `${VEC_TYPE_BY_KIND[as][selected.length - 1]}(${selected.join(", ")})`;
    }

    /**
   * Formats one immediate dword as a GLSL literal.
   *
   * @param {{uint32:number,float32:number|null}} value Immediate value views.
   * @param {"float"|"int"|"uint"} as Literal type.
   * @returns {string} GLSL literal.
   * @private
   */
    _literal(value, as)
    {
        if (as === "uint")
        {
            return `${value.uint32 >>> 0}u`;
        }
        if (as === "int")
        {
            return `${value.uint32 | 0}`;
        }
        const float = value.float32;
        if (!Number.isFinite(float))
        {
            return `uintBitsToFloat(${value.uint32 >>> 0}u)`;
        }
        if (Object.is(float, -0))
        {
            return "-0.0";
        }
        const text = String(float);
        return /[.e]/.test(text) ? text : `${text}.0`;
    }

    /**
   * Applies the operand's component selection against a destination mask.
   *
   * @param {object} operand Decoded operand.
   * @param {string} destMask Destination write mask.
   * @returns {string} Swizzle suffix including the leading dot, or empty.
   * @private
   */
    _swizzleSuffix(operand, destMask)
    {
        if (operand.componentCount < 4)
        {
            return "";
        }
        let selected = "";
        if (operand.selectionModeName === "select1")
        {
            selected = operand.selected;
        }
        else if (operand.selectionModeName === "swizzle")
        {
            selected = [ ...destMask ]
                .map((component) => operand.swizzle[COMPONENT_INDEX[component]])
                .join("");
        }
        else if (operand.selectionModeName === "mask" && operand.mask && operand.mask !== "xyzw")
        {
            selected = operand.mask;
        }
        else
        {
            return "";
        }
        const remapped = this.remapComponents(operand, selected);
        return remapped ? `.${remapped}` : "";
    }

    /**
   * Reads a purely immediate operand index.
   *
   * @param {object} operand Decoded operand.
   * @param {number} dimension Index dimension.
   * @returns {number} Immediate index value.
   * @private
   */
    _immediateIndex(operand, dimension)
    {
        const index = operand.indices[dimension];
        if (!index || index.values.length === 0 || index.relative)
        {
            throw new WebglReadError("Expected an immediate register index", {
                operandType: operand.typeName,
                dimension
            });
        }
        return index.values[0];
    }

    /**
   * Formats an operand index that may combine an immediate offset with a
   * relative register (for example `cb3[r1.y + 26]`).
   *
   * @param {object} operand Decoded operand.
   * @param {number} dimension Index dimension.
   * @returns {string} GLSL index expression.
   * @private
   */
    _indexExpression(operand, dimension)
    {
        const index = operand.indices[dimension];
        if (!index)
        {
            throw new WebglReadError("Missing operand index dimension", {
                operandType: operand.typeName,
                dimension
            });
        }
        if (index.representation === 1 || index.representation === 4)
        {
            throw new WebglReadError("64-bit register indices are not supported by the WebGL2 emitter", {
                operandType: operand.typeName,
                dimension
            });
        }

        const immediate = index.values.length ? index.values[0] : null;
        const relative = index.relative
            ? this.sourceExpression(index.relative, { destMask: "x", as: "int" })
            : null;

        if (relative && immediate)
        {
            return `${relative} + ${immediate}`;
        }
        if (relative)
        {
            return relative;
        }
        if (immediate === null)
        {
            throw new WebglReadError("Operand index has neither immediate nor relative part", {
                operandType: operand.typeName,
                dimension
            });
        }
        return String(immediate);
    }
}
