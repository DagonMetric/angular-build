import { AppProjectConfigInternal, LibProjectConfigInternal } from '../models/internals';

export function applyProjectConfigWithEnvironment(
    projectConfig: AppProjectConfigInternal | LibProjectConfigInternal,
    env: { [key: string]: boolean | string }): void {
    if (env.dll && projectConfig._projectType === 'app') {
        (projectConfig as AppProjectConfigInternal)._isDll = true;
    }

    if (!projectConfig.envOverrides ||
        Object.keys(projectConfig.envOverrides).length === 0) {
        return;
    }

    const buildTargets: string[] = [];

    if (env.production || env.prod) {
        if (!buildTargets.includes('prod')) {
            buildTargets.push('prod');
        }
        if (!buildTargets.includes('production')) {
            buildTargets.push('production');
        }
    } else if (env.dev || env.development) {
        buildTargets.push('dev');
        buildTargets.push('development');
    }

    const preDefinedKeys = ['prod', 'production', 'dev', 'development'];

    Object.keys(env)
        .filter(key => !preDefinedKeys.includes(key.toLowerCase()) &&
            !buildTargets.includes(key) &&
            env[key] &&
            (typeof env[key] === 'boolean' || env[key] === 'true'))
        .forEach(key => {
            buildTargets.push(key);
        });

    Object.keys(projectConfig.envOverrides)
        .forEach((buildTargetKey: string) => {
            const targetName = buildTargetKey;
            const targets = targetName.split(',');
            targets.forEach(t => {
                t = t.trim();
                if (buildTargets.indexOf(t) > -1 && projectConfig.envOverrides) {
                    const newConfig = projectConfig.envOverrides[t];
                    if (newConfig && typeof newConfig === 'object') {
                        overrideProjectConfig(projectConfig, newConfig);
                    }
                }
            });
        });
}

// tslint:disable-next-line: no-any
function overrideProjectConfig(oldConfig: { [key: string]: any }, newConfig: { [key: string]: any }): void {
    if (!newConfig || !oldConfig || typeof newConfig !== 'object' || Object.keys(newConfig).length === 0) {
        return;
    }

    Object.keys(newConfig).filter((key: string) => key !== 'envOverrides').forEach((key: string) => {
        oldConfig[key] = JSON.parse(JSON.stringify(newConfig[key]));
    });
}
