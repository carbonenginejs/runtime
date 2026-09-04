const DX11_AVATAR_ROOT = "res:/graphics/effect.dx11/managed/interior/avatar/";

const ROUTES = Object.freeze([
    {
        family: "linear",
        names: [ "skinnedavatarbrdflinear" ],
        target: DX11_AVATAR_ROOT + "skinnedavatarbrdflinear.sm_hi",
        required: [ "TransformUV0", "DiffuseMap", "NormalMap", "SpecularMap" ],
        controls: [
            "TransformUV0", "MaterialDiffuseColor", "MaterialSpecularColor",
            "MaterialSpecularCurve", "MaterialSpecularFactors", "MaterialCutoutColor",
            "MaterialLibraryID", "MaterialCubeReflection", "MaterialCubeReflectionControl",
            "MaterialCubeReflectionColor", "SkinGlowColor", "SkinGlowThreshold",
            "SkinGlowSpecularAlpha", "DecalClip"
        ]
    },
    {
        family: "double-linear",
        names: [ "skinnedavatarbrdfdoublelinear" ],
        target: DX11_AVATAR_ROOT + "skinnedavatarbrdfdoublelinear.sm_hi",
        required: [ "TransformUV0", "DiffuseMap", "NormalMap", "SpecularMap" ],
        controls: [
            "TransformUV0", "MaterialDiffuseColor", "MaterialSpecularColor",
            "MaterialSpecularCurve", "MaterialSpecularFactors", "MaterialCutoutColor",
            "MaterialLibraryID", "MaterialCubeReflection", "MaterialCubeReflectionControl",
            "MaterialCubeReflectionColor", "Material2DiffuseColor", "Material2SpecularColor",
            "Material2SpecularCurve", "Material2SpecularFactors", "Material2LibraryID",
            "Material2CubeReflection", "Material2CubeReflectionControl",
            "Material2CubeReflectionColor", "SkinGlowColor", "SkinGlowThreshold",
            "SkinGlowSpecularAlpha", "DecalClip"
        ]
    },
    {
        family: "detailed-hair",
        names: [ "skinnedavatarhair_detailed" ],
        target: DX11_AVATAR_ROOT + "skinnedavatarhair_detailed.sm_hi",
        required: [ "TransformUV0", "DiffuseMap", "NormalMap", "SpecularMap", "TangentMap" ],
        controls: [
            "TransformUV0", "MaterialDiffuseColor", "MaterialCutoutColor", "HairDiffuseBias",
            "HairParameters", "HairSpecularColor1", "HairSpecularColor2",
            "HairSpecularFactors1", "HairSpecularFactors2", "TangentMapParameters"
        ]
    }
]);

const TEXTURE_PARAMETERS = Object.freeze([
    "DiffuseMap", "NormalMap", "SpecularMap", "TangentMap", "IrradianceMap",
    "ColorNdotLLookupMap", "ReflectionMap", "ClothingReflectionCube", "ShadowCubeMap0",
    "CutMaskMap", "FresnelLookupMap", "SpotlightShadow0", "SpotlightShadow1",
    "SpotlightShadow2", "SpotlightShadow3"
]);

/**
 * Backend-only router from audited avatar effects to DX11 shader paths, which
 * the resource host overlays to WebGL2. It preserves only compatible material
 * state on the passed live effect and does not reach for a global facade.
 */
export class CjsCharacterWebgl2EffectRouter
{
    static Route(effects)
    {
        const report = {
            status: "unchanged",
            requiresWatch: false,
            applied: [],
            deferred: [],
            retained: []
        };
        const seen = new Set();
        for (const effect of effects ?? [])
        {
            if (!effect || seen.has(effect)) continue;
            seen.add(effect);
            const result = RouteEffect(effect);
            report.requiresWatch ||= result.requiresWatch === true;
            report[result.status]?.push(result);
        }
        if (report.applied.length) report.status = "applied";
        else if (report.deferred.length) report.status = "deferred";
        return report;
    }

    static RestoreAfterWatch(effects)
    {
        const report = { status: "unchanged", restored: [], deferred: [] };
        const seen = new Set();
        for (const effect of effects ?? [])
        {
            if (!effect || seen.has(effect)) continue;
            seen.add(effect);
            const result = RestoreRoutedEffectAfterWatch(effect);
            report[result.status]?.push(result);
        }
        if (report.restored.length) report.status = "restored";
        else if (report.deferred.length) report.status = "deferred";
        return report;
    }
}

function RouteEffect(effect)
{
    const sourcePath = String(effect?.effectFilePath ?? "").trim();
    if (IsDx11AvatarPath(sourcePath))
    {
        return { status: "retained", sourcePath, reason: "already-dx11" };
    }
    const route = FindRoute(sourcePath);
    if (!route) return { status: "retained", sourcePath, reason: "family-unqualified" };
    if (!route.required.every(name => HasParameter(effect, name)))
    {
        return {
            status: "deferred", sourcePath, targetPath: route.target, family: route.family,
            reason: "source-contract-unqualified"
        };
    }

    const snapshot = CaptureEffectState(effect, route);
    try
    {
        SetEffectFilePath(effect, route.target);
        effect.Initialize?.();
        effect.AutoPopulate?.(false);
        if (!route.required.every(name => HasParameter(effect, name)))
        {
            throw new Error("destination-contract-unqualified");
        }
        const restored = RestoreEffectSnapshot(effect, snapshot);
        effect._characterAuthoredEffectFilePath ??= sourcePath;
        effect._characterWebgl2EffectRoute = {
            status: "applied",
            family: route.family,
            sourcePath,
            targetPath: route.target,
            initialRestore: restored
        };
        effect._characterWebgl2EffectRouteSnapshot = snapshot;
        return { ...effect._characterWebgl2EffectRoute, requiresWatch: true };
    }
    catch (error)
    {
        RestoreEffectState(effect, snapshot);
        return {
            status: "deferred", sourcePath, targetPath: route.target, family: route.family,
            reason: String(error?.message ?? error), requiresWatch: true
        };
    }
}

function RestoreRoutedEffectAfterWatch(effect)
{
    const route = effect?._characterWebgl2EffectRoute;
    const snapshot = effect?._characterWebgl2EffectRouteSnapshot;
    if (!route || !snapshot) return { status: "retained" };
    if (String(effect?.effectFilePath ?? "") !== route.targetPath)
    {
        return {
            status: "deferred", sourcePath: route.sourcePath, targetPath: route.targetPath,
            family: route.family, reason: "destination-path-replaced-before-watch-restore"
        };
    }
    try
    {
        const contract = ROUTES.find(candidate => candidate.family === route.family
            && candidate.target === route.targetPath);
        if (!contract || !contract.required.every(name => HasParameter(effect, name)))
        {
            throw new Error("destination-contract-unqualified-after-watch");
        }
        const restored = RestoreEffectSnapshot(effect, snapshot);
        route.finalRestore = restored;
        return {
            status: "restored", sourcePath: route.sourcePath, targetPath: route.targetPath,
            family: route.family, ...restored
        };
    }
    catch (error)
    {
        return {
            status: "deferred", sourcePath: route.sourcePath, targetPath: route.targetPath,
            family: route.family, reason: String(error?.message ?? error)
        };
    }
}

function FindRoute(path)
{
    const normalized = String(path).toLowerCase();
    return ROUTES.find(route => route.names.some(name => new RegExp(
        "(?:^|/)" + name.replace("_", "(?:_|)") + "\\.(?:fx|sm_[a-z0-9_]+)$",
        "u"
    ).test(normalized))) ?? null;
}

function IsDx11AvatarPath(path)
{
    return /^res:\/graphics\/effect\.dx11\/managed\/interior\/avatar\//iu.test(path);
}

function CaptureEffectState(effect, route)
{
    return {
        effectFilePath: String(effect?.effectFilePath ?? ""),
        controls: CaptureControls(effect, route.controls),
        textures: CaptureTextures(effect)
    };
}

function RestoreEffectState(effect, snapshot)
{
    SetEffectFilePath(effect, snapshot.effectFilePath);
    effect.Initialize?.();
    effect.AutoPopulate?.(false);
    RestoreControls(effect, snapshot.controls);
    RestoreTextures(effect, snapshot.textures);
}

function RestoreEffectSnapshot(effect, snapshot)
{
    return {
        restoredControls: RestoreControls(effect, snapshot.controls),
        restoredTextures: RestoreTextures(effect, snapshot.textures),
        passStatePolicy: "native-dx11"
    };
}

function CaptureControls(effect, names)
{
    const controls = {};
    for (const name of names)
    {
        const value = ReadParameterValue(effect?.parameters?.[name]);
        const shape = GetShape(value);
        if (shape) controls[name] = { value, shape };
    }
    return controls;
}

function RestoreControls(effect, controls)
{
    const restored = [];
    for (const [ name, source ] of Object.entries(controls ?? {}))
    {
        const parameter = effect?.parameters?.[name];
        if (!parameter || GetShape(ReadParameterValue(parameter)) !== source.shape) continue;
        SetParameterValue(effect, name, parameter, source.value);
        restored.push(name);
    }
    return restored;
}

function CaptureTextures(effect)
{
    const textures = {};
    for (const name of TEXTURE_PARAMETERS)
    {
        const parameter = effect?.parameters?.[name];
        if (!parameter) continue;
        const resourcePath = String(
            parameter?.resourcePath || parameter?.textureRes?.path || ""
        ).trim();
        if (!parameter?.textureRes && !resourcePath) continue;
        textures[name] = {
            textureRes: parameter.textureRes ?? null,
            resourcePath,
            isAttached: parameter.isAttached === true
        };
    }
    return textures;
}

function RestoreTextures(effect, textures)
{
    const restored = [];
    for (const [ name, source ] of Object.entries(textures ?? {}))
    {
        const parameter = effect?.parameters?.[name];
        if (!parameter) continue;
        if (source.textureRes && typeof parameter.AttachTextureRes === "function")
        {
            parameter.AttachTextureRes(source.textureRes);
            restored.push(name);
        }
        else if (source.resourcePath && typeof parameter.SetValue === "function")
        {
            parameter.SetValue(source.resourcePath);
            restored.push(name);
        }
    }
    return restored;
}

function HasParameter(effect, name)
{
    return Boolean(effect?.parameters?.[name]);
}

function SetEffectFilePath(effect, effectFilePath)
{
    if (typeof effect?.SetValues === "function") effect.SetValues({ effectFilePath });
    else effect.effectFilePath = effectFilePath;
}

function ReadParameterValue(parameter)
{
    try
    {
        const value = typeof parameter?.GetValue === "function"
            ? parameter.GetValue([])
            : parameter?.value;
        if (Array.isArray(value) || ArrayBuffer.isView(value)) return Array.from(value);
        return Number.isFinite(value) ? value : null;
    }
    catch
    {
        return null;
    }
}

function SetParameterValue(effect, name, parameter, value)
{
    const copy = Array.isArray(value) ? [ ...value ] : value;
    if (typeof parameter?.SetValue === "function")
    {
        parameter.SetValue(copy);
        return;
    }
    if (typeof effect?.SetParameters === "function"
        && effect.SetParameters({ [name]: copy }) !== false) return;
    throw new Error("WebGL2 effect route cannot restore " + name);
}

function GetShape(value)
{
    if (Number.isFinite(value)) return "scalar";
    if (!Array.isArray(value) || !value.length || !value.every(Number.isFinite)) return null;
    return "vector-" + value.length;
}

export default CjsCharacterWebgl2EffectRouter;
