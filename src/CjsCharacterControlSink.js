/**
 * Structural destination for one character-control binding.
 * Every used channel requires both its Set and Reset method.
 *
 * @typedef {object} CjsCharacterControlSink
 * @property {(name: string, value: number) => void} [SetMorph]
 * @property {(name: string) => void} [ResetMorph]
 * @property {(name: string, value: number) => void} [SetParameter]
 * @property {(name: string) => void} [ResetParameter]
 * @property {(name: string, value: Float32Array) => void} [SetBoneOffset]
 * @property {(name: string) => void} [ResetBoneOffset]
 * @property {(name: string) => void} [SetActivePose]
 * @property {(name: string) => void} [ResetActivePose]
 */

export {};
