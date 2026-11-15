import { meta, type } from "#schema";
import "./CjsCharacterDataParameter.js";
import "./CjsCharacterDataTexture.js";
import "./CjsCharacterDataShaderRule.js";

/**
 * One area shader's generic data: the parameters it takes, the textures and parameters every area drawn with it
 * starts from, and the rules that set more on some of its areas. The generic holds these in `areaShaders`; the
 * shipped defaults are `factory/defaults/areaShaders.json`.
 *
 * Modelled on: EveSOFDataGenericShader (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:2224-2247)
 * Carbon's `m_transparencyTextureName` and `m_doGenerateDepthArea` serve the SOF's depth areas, which the paper doll
 * has none of, so they are not kept. `rules` is ours (`CjsCharacterDataShaderRule`).
 */
@meta.define("CjsCharacterDataShader")
export class CjsCharacterDataShader
{

    /** The shader's file name, lowercase (`skinnedavatarbrdflinear.fx`), by which areas find it. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    shader = "";

    /**
     * Every parameter the shader takes. Kept for Carbon's shape: Carbon filters the hull's parameters by it
     * (EveSOF.cpp:820-827), which the paper doll has none of, so nothing reads it. Carbon holds
     * `EveSOFDataGenericString` records (EveSOFData.h:2241); plain strings here.
     */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    parameters = [];

    /** The textures an area starts from, each filling only a slot the area leaves empty. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataTexture")
    defaultTextures = [];

    /** The parameters an area starts from. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataParameter")
    defaultParameters = [];

    /** The rules that set more parameters on some of its areas. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataShaderRule")
    rules = [];

}
