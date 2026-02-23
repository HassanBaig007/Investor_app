describe('apiConfig', () => {
    const originalEnv = process.env;
    const originalGlobal = globalThis.__SPLITFLOW_API_URL__;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        delete process.env.SPLITFLOW_API_URL;
        delete process.env.API_BASE_URL;
        delete globalThis.__SPLITFLOW_API_URL__;
    });

    afterAll(() => {
        process.env = originalEnv;
        if (originalGlobal === undefined) {
            delete globalThis.__SPLITFLOW_API_URL__;
        } else {
            globalThis.__SPLITFLOW_API_URL__ = originalGlobal;
        }
    });

    it('returns runtime override first, then env, then default', () => {
        globalThis.__SPLITFLOW_API_URL__ = ' http://10.0.2.2:3000/ ';
        process.env.SPLITFLOW_API_URL = 'http://api.example.com/';

        const { getApiBaseCandidates } = require('../apiConfig');
        const candidates = getApiBaseCandidates();

        expect(candidates).toEqual([
            'http://10.0.2.2:3000',
            'http://api.example.com',
            'http://localhost:3000',
        ]);
    });

    it('uses API_BASE_URL when SPLITFLOW_API_URL is missing', () => {
        process.env.API_BASE_URL = 'https://staging.splitflow.app/';

        const { getApiBaseCandidates, getInitialApiBase } = require('../apiConfig');
        const candidates = getApiBaseCandidates();

        expect(candidates[0]).toBe('https://staging.splitflow.app');
        expect(getInitialApiBase()).toBe('https://staging.splitflow.app');
    });

    it('de-duplicates identical candidates and falls back to default', () => {
        globalThis.__SPLITFLOW_API_URL__ = 'http://localhost:3000/';
        process.env.SPLITFLOW_API_URL = 'http://localhost:3000/';

        const { getApiBaseCandidates, getInitialApiBase } = require('../apiConfig');
        const candidates = getApiBaseCandidates();

        expect(candidates).toEqual(['http://localhost:3000']);
        expect(getInitialApiBase()).toBe('http://localhost:3000');
    });
});
