﻿import * as glob from 'glob';
import * as path from 'path';
import * as webpack from 'webpack';

import * as webpackMerge from 'webpack-merge';

import { Logger } from '../utils';

// configs
import { getCommonConfigPartial } from './common';
import { getAngularConfigPartial } from './angular';
import { getStylesConfigPartial } from './styles';

// models
import { WebpackConfigOptions } from './webpack-config-options';

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('istanbul-instrumenter-loader')
 *
 */

/**
 * Test options.
 * @additionalProperties false
 */
export interface TestOptions {
    testAppName?: string;
    /**
     * Generate code ceverage report.
     */
    codeCoverage?: boolean |
    {
        exclude?: string[];
        disabled?: boolean;
    };
}


// TODO: move to separate webpack.config.test.js file
// export function getKarmaConfigOptions(projectRoot: string) {
//    const logger = new Logger();
//    const buildOptions: BuildOptions = { test: true };
//    const angularBuildConfig = getAngularBuildConfig(projectRoot);

//    const appConfigs = getAppConfigs(projectRoot, buildOptions, angularBuildConfig, logger);
//    if (!appConfigs || appConfigs.length === 0) {
//        //throw new Error('No test app is configured.');
//        logger.log('\n');
//        logger.errorLine('No test app is configured.');
//        process.exit(-1);
//    }

//    const appConfig = appConfigs[0];
//    let codeCoverage = false;
//    if (angularBuildConfig.test && angularBuildConfig.test.codeCoverage) {
//        if (typeof angularBuildConfig.test.codeCoverage === 'boolean') {
//            codeCoverage = angularBuildConfig.test.codeCoverage;
//        } else if (typeof angularBuildConfig.test.codeCoverage === 'object' && !(<any>angularBuildConfig.test.codeCoverage).disabled) {
//            codeCoverage = true;
//        }
//    }

//    const testWebpackConfigs = getWebpackConfig(projectRoot, appConfig, buildOptions, angularBuildConfig, true, logger);
//    const appRoot = path.resolve(projectRoot, appConfig.root);

//    const files: any[] = [];
//    const preprocessors: any = {};

//    let filePattern = path.relative(projectRoot, path.resolve(projectRoot, appConfig.root, appConfig.main));
//    filePattern = filePattern.replace(/\\/g, '/');
//    if (!filePattern.startsWith('./')) {
//        filePattern = `./${filePattern}`;
//    }
//    preprocessors[filePattern] = ['webpack', 'sourcemap'];
//    files.push({ pattern: filePattern, watched: false });

//    // Polyfills
//    //if (appConfig.polyfills && appConfig.polyfills.length > 0) {
//    //    if (typeof appConfig.polyfills === 'string') {
//    //        const polyfillsFile = path.resolve(appRoot, appConfig.polyfills);
//    //        preprocessors[polyfillsFile] = ['webpack', 'sourcemap'];
//    //        files.push({
//    //            pattern: polyfillsFile,
//    //            included: true,
//    //            served: true,
//    //            watched: true
//    //        });
//    //    }
//    //}

//    // Scripts
//    if (appConfig.scripts && appConfig.scripts.length > 0) {
//        const globalScripts = parseGlobalScopedEntry(appConfig.scripts, appRoot, 'scripts');
//        // add entry points and lazy chunks
//        const globalScriptPatterns = globalScripts
//            .filter((script: GlobalScopedEntry & { path?: string; entry?: string; }) => !(script.output || script.lazy))
//            .map(script => {
//                let scriptPattern = path.relative(projectRoot, path.resolve(projectRoot, appConfig.root, script.input));
//                scriptPattern = scriptPattern.replace(/\\/g, '/');
//                if (!scriptPattern.startsWith('./')) {
//                    scriptPattern = `./${scriptPattern}`;
//                }

//                return {
//                    pattern: scriptPattern,
//                    included: true,
//                    served: true,
//                    watched: false
//                };
//            });
//        files.push(...globalScriptPatterns);
//    }

//    const proxies: any = {};
//    if (appConfig.assets && appConfig.assets.length) {
//        const appRoot = path.resolve(projectRoot, appConfig.root);
//        const assetEntries = parseCopyAssetEntry(appRoot, appConfig.assets);
//        assetEntries.forEach((assetEntry: AssetEntry) => {

//            const removeGlobFn = (p: string): string => {
//                if (p.endsWith('/**/*')) {
//                    return p.substr(0, p.length - 5);
//                } else if (p.endsWith('/**')) {
//                    return p.substr(0, p.length - 3);
//                } else if (p.endsWith('/*')) {
//                    return p.substr(0, p.length - 2);
//                }
//                return p;
//            };

//            let from: string = '';
//            let assetsPattern: string = '';

//            if (typeof (assetEntry.from) === 'object') {
//                const objFrom: {
//                    glob: string;
//                    dot?: boolean;
//                } = assetEntry.from;
//                const fromGlob = objFrom.glob;
//                from = removeGlobFn(fromGlob);
//                assetsPattern = path.relative(projectRoot, path.resolve(projectRoot, appConfig.root, fromGlob));
//            } else if (typeof (assetEntry.from) === 'string') {
//                const strFrom = assetEntry.from;
//                from = removeGlobFn(strFrom);
//                assetsPattern = path.relative(projectRoot, path.resolve(projectRoot, appConfig.root, strFrom));
//            }
//            assetsPattern = assetsPattern.replace(/\\/g, '/');
//            if (!assetsPattern.startsWith('./')) {
//                assetsPattern = `./${assetsPattern}`;
//            }

//            files.push({ pattern: assetsPattern, watched: false, included: false, served: true, nocache: false });

//            let relativePath: string, proxyPath: string;

//            if (from && fs.existsSync(path.resolve(projectRoot, appConfig.root, from))) {
//                relativePath = path.relative(projectRoot, path.resolve(projectRoot, appConfig.root, from));
//                if (path.isAbsolute(relativePath)) {
//                    //throw new Error(`Absolute path is not allowed in assets entry 'from', path: ${relativePath}`);
//                    logger.log('\n');
//                    logger.errorLine(`Absolute path is not allowed in assets entry 'from', path: ${relativePath}`);
//                    rocess.exit(-1);
//                }

//                if (assetEntry.to) {
//                    proxyPath = assetEntry.to;
//                } else {
//                    proxyPath = from;
//                }
//            } else {
//                // For globs
//                relativePath = path.relative(projectRoot, path.resolve(projectRoot, appConfig.root));
//                proxyPath = assetEntry.to || '';
//            }

//            // Proxy paths must have only forward slashes.
//            proxyPath = proxyPath.replace(/\\/g, '/');
//            relativePath = relativePath.replace(/\\/g, '/');

//            if (proxyPath.startsWith('/')) {
//                proxyPath = proxyPath.substr(1);
//            }
//            const proxyKey = `/${proxyPath}`;
//            proxies[proxyKey] = `/base/${relativePath}`;
//        });
//    }

//    const karmaOptions: any = {
//        webpackConfig: testWebpackConfigs,
//        files: files,
//        preprocessors: preprocessors,
//        proxies: proxies,
//        codeCoverage: codeCoverage
//    };

//    return karmaOptions;
// }

export function getTestConfig(webpackConfigOptions: WebpackConfigOptions): webpack.Configuration {
    const buildOptions = webpackConfigOptions.buildOptions;
    const projectConfig = webpackConfigOptions.projectConfig;
    const logger = webpackConfigOptions.logger || new Logger();

    logger.log('\n');
    logger.infoLine(`Using test config, env: ${JSON
        .stringify(buildOptions.environment)}, name: ${projectConfig.name}, platform target: ${projectConfig
            .platformTarget}, test entry: ${projectConfig.entry}\n`);

    const configs: any[] = [
        getCommonConfigPartial(webpackConfigOptions),
        getAngularConfigPartial(webpackConfigOptions),
        getStylesConfigPartial(webpackConfigOptions),
        getTestConfigPartial(webpackConfigOptions)
    ];

    // TODO: necessary?
    // if (buildOptions.forceUseNgToolsWebpack) {
    //    configs.push(getNonDllConfigPartial(projectRoot, appConfig, angularBuildConfig.test, logger));
    // }

    return webpackMerge(configs);
}

export function getTestConfigPartial(webpackConfigOptions: WebpackConfigOptions): webpack.Configuration {
    const projectRoot = webpackConfigOptions.projectRoot;
    const projectConfig = webpackConfigOptions.projectConfig;

    const testOptions: TestOptions = (webpackConfigOptions.angularBuildConfig as any).testOptions || {};
    const extraRules: any[] = [];

    if (testOptions.codeCoverage) {
        let codeCoverageExclude: string[] = [];
        if (typeof testOptions.codeCoverage === 'object') {
            codeCoverageExclude = (<any>testOptions.codeCoverage).exclude || [];
        }

        let exclude: (string | RegExp)[] = [
            /\.(e2e|spec|e2e-spec)\.ts$/,
            /node_modules/
        ];

        if (codeCoverageExclude.length > 0) {
            codeCoverageExclude.forEach((excludeGlob: string) => {
                const excludeFiles = glob
                    .sync(path.join(projectRoot, excludeGlob), { nodir: true })
                    .map((file: string) => path.normalize(file));
                exclude.push(...excludeFiles);
            });
        }


        extraRules.push({
            test: /\.(js|ts)$/,
            loader: 'istanbul-instrumenter-loader',
            enforce: 'post',
            include: path.resolve(projectRoot, projectConfig.srcDir),
            exclude
        });
    }

    return {
        //   devtool: testConfig.sourcemaps ? 'inline-source-map' : 'eval',
        entry: {
            // appConfig.test
            test: path.resolve(projectRoot, projectConfig.srcDir, projectConfig.entry)
        },
        module: {
            rules: extraRules
        }
    };
}