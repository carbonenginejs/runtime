import { meta, type } from "#schema";

// Discovery: src/character/discovery/scenes_scene.yaml
// Resource pattern: res:/animation_gstate/scenes/*

/**
 * A scene document containing source character records, without building characters.
 * Storage defaults initialize empty records; they are not inferred authored defaults.
 */
@meta.define("CjsCharacterScene")
export class CjsCharacterScene
{

    /** Ordered authored character records. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterSceneCharacter")
    characters = [];

}
