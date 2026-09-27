// A WebGL2RenderingContext stand-in for the WebGL backend's unit tests.
//
// It records every call and keeps buffer contents, so a test can assert both
// what the backend asked the device to do and what bytes ended up where. It is
// not a GL implementation: it checks nothing a real context would refuse
// beyond what a test asserts itself.

let nextEnum = 0x9000;

/** The enums the backend reads off the context. Values are arbitrary but distinct. */
const ENUMS = [
    "ARRAY_BUFFER", "ELEMENT_ARRAY_BUFFER", "COPY_READ_BUFFER", "COPY_WRITE_BUFFER", "UNIFORM_BUFFER",
    "STATIC_DRAW", "DYNAMIC_DRAW",
    "VERTEX_ARRAY_BINDING", "ARRAY_BUFFER_BINDING", "TEXTURE_BINDING_2D",
    "TEXTURE_2D", "TEXTURE_MIN_FILTER", "TEXTURE_MAG_FILTER", "NEAREST",
    "R32F", "RED", "FLOAT", "R32UI", "RED_INTEGER", "UNSIGNED_INT", "R32I", "INT",
    "RGBA32F", "RGBA", "RGBA32UI", "RGBA_INTEGER",
    "REPEAT", "MIRRORED_REPEAT", "CLAMP_TO_EDGE", "LINEAR",
    "NEAREST_MIPMAP_NEAREST", "NEAREST_MIPMAP_LINEAR", "LINEAR_MIPMAP_NEAREST", "LINEAR_MIPMAP_LINEAR",
    "TEXTURE_WRAP_S", "TEXTURE_WRAP_T", "TEXTURE_WRAP_R", "TEXTURE_MIN_LOD", "TEXTURE_MAX_LOD",
    "TEXTURE_COMPARE_MODE", "TEXTURE_COMPARE_FUNC", "COMPARE_REF_TO_TEXTURE"
];

/**
 * Builds a fake context.
 *
 * @returns {{gl: object, calls: Array}} The context and its call log.
 */
export function FakeWebgl2()
{
    const calls = [];
    const bindings = new Map();
    const gl = { calls };

    for (const name of ENUMS) gl[name] = nextEnum++;

    let vertexArray = null;

    Object.assign(gl, {
        createBuffer()
        {
            const buffer = { kind: "buffer", bytes: new Uint8Array(0), usage: 0 };
            calls.push([ "createBuffer", buffer ]);
            return buffer;
        },
        deleteBuffer(buffer) { calls.push([ "deleteBuffer", buffer ]); },
        bindBuffer(target, buffer)
        {
            bindings.set(target, buffer);
            calls.push([ "bindBuffer", target, buffer ]);
        },
        bufferData(target, data, usage)
        {
            const buffer = bindings.get(target);
            buffer.bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
            buffer.usage = usage;
            calls.push([ "bufferData", target, buffer, buffer.bytes.slice(), usage ]);
        },
        bufferSubData(target, offset, data)
        {
            const buffer = bindings.get(target);
            const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            buffer.bytes.set(bytes, offset);
            calls.push([ "bufferSubData", target, buffer, offset, bytes.slice() ]);
        },
        getBufferSubData(target, offset, view)
        {
            const buffer = bindings.get(target);
            view.set(buffer.bytes.subarray(offset, offset + view.length));
            calls.push([ "getBufferSubData", target, buffer, offset, view.length ]);
        },
        createTexture()
        {
            const texture = { kind: "texture" };
            calls.push([ "createTexture", texture ]);
            return texture;
        },
        deleteTexture(texture) { calls.push([ "deleteTexture", texture ]); },
        bindTexture(target, texture)
        {
            bindings.set(target, texture);
            calls.push([ "bindTexture", target, texture ]);
        },
        texImage2D(...args) { calls.push([ "texImage2D", bindings.get(gl.TEXTURE_2D), ...args ]); },
        texParameteri(...args) { calls.push([ "texParameteri", ...args ]); },
        createSampler()
        {
            const sampler = { kind: "sampler", parameters: new Map() };
            calls.push([ "createSampler", sampler ]);
            return sampler;
        },
        deleteSampler(sampler) { calls.push([ "deleteSampler", sampler ]); },
        samplerParameteri(sampler, name, value) { sampler.parameters.set(name, value); },
        samplerParameterf(sampler, name, value) { sampler.parameters.set(name, value); },
        getExtension(name) { return gl.extensions?.[name] ?? null; },
        bindVertexArray(array)
        {
            vertexArray = array;
            calls.push([ "bindVertexArray", array ]);
        },
        getParameter(name)
        {
            if (name === gl.VERTEX_ARRAY_BINDING) return vertexArray;
            if (name === gl.ARRAY_BUFFER_BINDING) return bindings.get(gl.ARRAY_BUFFER) ?? null;
            if (name === gl.TEXTURE_BINDING_2D) return bindings.get(gl.TEXTURE_2D) ?? null;
            return null;
        }
    });

    return { gl, calls };
}

/**
 * A render context stand-in: the resources ask it only for validity and the
 * WebGL2 context.
 *
 * @param {object} gl The fake context.
 * @param {boolean} [valid] Whether the context reports itself valid.
 * @returns {object} The render context.
 */
export function FakeRenderContext(gl, valid = true)
{
    return { IsValid: () => valid, GetWebgl2: () => gl };
}
