import * as path from 'path';

import * as webpack from 'webpack';

import {
    AngularBuildContext,
    BeforeRunCleanOptions,
    CleanOptions,
    InternalError,
    InvalidConfigError,
    LibProjectConfigInternal
} from '../../models';

import { CleanWebpackPlugin } from '../../plugins/clean-webpack-plugin';
import { CopyWebpackPlugin } from '../../plugins/copy-webpack-plugin';
import { LibBundleWebpackPlugin } from '../../plugins/lib-bundle-webpack-plugin';
import { TelemetryWebpackPlugin } from '../../plugins/telemetry-webpack-plugin';

export function getLibWebpackConfig(angularBuildContext: AngularBuildContext): webpack.Configuration | null {
    const libConfig = angularBuildContext.projectConfig as LibProjectConfigInternal;

    if (!libConfig.outDir) {
        throw new InvalidConfigError(`The 'libs[${libConfig._index
            }].outDir' value is required.`);
    }

    const projectRoot = AngularBuildContext.projectRoot;

    const srcDir = path.resolve(projectRoot, libConfig.srcDir || '');
    const outDir = path.resolve(projectRoot, libConfig.outDir);
    const plugins: webpack.Plugin[] = [];

    // clean
    const shouldClean = (AngularBuildContext.cleanOutDirs ||
        (libConfig.clean && libConfig.clean.beforeRun));
    if (shouldClean) {
        const cleanOptions = Object.assign({}, libConfig.clean || {}) as CleanOptions;
        cleanOptions.beforeRun = cleanOptions.beforeRun || {} as BeforeRunCleanOptions;
        const beforeRunOption = cleanOptions.beforeRun;
        if (typeof beforeRunOption.cleanOutDir === 'undefined' &&
            AngularBuildContext.cleanOutDirs) {
            beforeRunOption.cleanOutDir = true;
        }
        plugins.push(new CleanWebpackPlugin(Object.assign(cleanOptions,
            {
                forceCleanToDisk: true,
                loggerOptions: AngularBuildContext.logger.loggerOptions
            })));
    }

    // preloading
    if (libConfig.banner && !angularBuildContext.bannerText) {
        throw new InternalError(`The 'angularBuildContext.bannerText' is not set.`);
    }
    if (angularBuildContext.rootPackageConfigPath && !angularBuildContext.rootPackageJson) {
        throw new InternalError(`The 'angularBuildContext.rootPackageJson' is not set.`);
    }
    if (angularBuildContext.packageConfigPath && !angularBuildContext.packageJson) {
        throw new InternalError(`The 'angularBuildContext.packageJson' is not set.`);
    }

    // styles, ngc, bundle, package.json copy
    plugins.push(new LibBundleWebpackPlugin({
        angularBuildContext: angularBuildContext
    }));

    // copy assets
    if (libConfig.copy && libConfig.copy.length > 0) {
        plugins.push(new CopyWebpackPlugin({
            assets: libConfig.copy,
            baseDir: srcDir,
            allowCopyOutsideOutputPath: true,
            forceWriteToDisk: true,
            loggerOptions: AngularBuildContext.logger.loggerOptions
        }));
    }

    // telemetry plugin
    if (!AngularBuildContext.telemetryPluginAdded) {
        AngularBuildContext.telemetryPluginAdded = true;
        plugins.push(new TelemetryWebpackPlugin());
    }

    if (!plugins.length) {
        return null;
    }

    const webpackConfig: webpack.Configuration = {
        // name: libConfig.name,
        entry: (() => ({})) as any,
        output: {
            path: outDir,
            filename: '[name].js'
        },
        context: projectRoot,
        plugins: plugins,
        stats: 'errors-only'
    };

    return webpackConfig;
}
