import { existsSync } from 'fs';
import * as path from 'path';

import { AngularBuildContext } from '../build-context';

export function resolveLoaderPath(loaderName: string): string {
    let resolvedPath = loaderName;
    let resolved = false;

    if (AngularBuildContext.nodeModulesPath) {
        if (existsSync(path.resolve(AngularBuildContext.nodeModulesPath, loaderName))) {
            resolvedPath = path.resolve(AngularBuildContext.nodeModulesPath, loaderName);
            resolved = true;
        }
    }

    if (!resolved && AngularBuildContext.fromBuiltInCli) {
        if (AngularBuildContext.cliRootPath) {
            const tempPath = path.resolve(AngularBuildContext.cliRootPath, 'node_modules', loaderName);
            if (existsSync(tempPath)) {
                resolvedPath = tempPath;
                resolved = true;
            }
        }

        if (!resolved && AngularBuildContext.nodeModulesPath) {
            const tempPath = path.resolve(AngularBuildContext.nodeModulesPath,
                '@dagonmetric/angular-build/node_modules', loaderName);
            if (existsSync(tempPath)) {
                resolvedPath = tempPath;
                resolved = true;
            }
        }

        if (!resolved) {
            const tempPath = require.resolve(loaderName);
            if (existsSync(tempPath)) {
                resolvedPath = tempPath;
            }
        }
    }

    return resolvedPath;
}
