const normalizeBaseUrl = (url) => {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;
    return trimmed.replace(/\/$/, '');
};

const readFirstDefinedEnv = (...keys) => {
    for (const key of keys) {
        const value = process?.env?.[key];
        if (value) return value;
    }
    return null;
};

const getDefaultApiBase = () => 'http://localhost:3000';

export const getApiBaseCandidates = () => {
    const runtimeOverride = normalizeBaseUrl(globalThis?.__SPLITFLOW_API_URL__);
    const configuredEnvBase = normalizeBaseUrl(
        readFirstDefinedEnv('SPLITFLOW_API_URL', 'API_BASE_URL')
    );

    return [...new Set([
        runtimeOverride,
        configuredEnvBase,
        getDefaultApiBase(),
    ].filter(Boolean))];
};

export const getInitialApiBase = () => getApiBaseCandidates()[0] || getDefaultApiBase();
