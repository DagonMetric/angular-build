﻿const fs = require('fs-extra');
import * as less from 'less';
import * as rollup from 'rollup';
import * as path from 'path';

import { minify as minifyHtml } from 'html-minifier';

// ReSharper disable CommonJsExternalModule
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const postcss = require('postcss');
const postcssUrl = require('postcss-url');

const rollupNodeResolve = require('rollup-plugin-node-resolve');
// ReSharper restore CommonJsExternalModule

// internal plugins
import ngResourceInline from '../plugins/rollup-plugin-ng-resource-inline';

import { Logger, sassPromise } from '../utils';
import { LibProjectConfig } from '../models';
import { prepareBannerSync } from '../helpers/prepare-banner';
import { RollupConfigOptions } from './rollup-config-options';

export * from './rollup-config-options';

export interface RollupInputOptions {
    input: string | string[];
    external?: ((id: string) => boolean) | string[];
    onwarn?(warning: rollup.Warning): void;
    plugins?: any[];
    context?: any;
    moduleContext?: ((id: string) => any) | { [id: string]: any };
}

export interface RollupOutputOptions {
    file: string;
    format: string;
    name?: string;
    exports?: 'auto' | 'default' | 'named' | 'none';
    globals?: { [id: string]: string };
    sourcemap?: boolean | 'inline';
    sourcemapFile?: string;
    banner?: string;
}

export function getRollupConfig(rollupConfigOptions: RollupConfigOptions): {
    inputOptions: RollupInputOptions;
    outputOptions: RollupOutputOptions;
} {
    const projectRoot = rollupConfigOptions.projectRoot;
    const buildOptions = rollupConfigOptions.buildOptions;
    const environment = buildOptions.environment || {};
    const libConfig = rollupConfigOptions.projectConfig as LibProjectConfig;
    const logger = rollupConfigOptions.logger || new Logger();

    const bundleRoot = rollupConfigOptions.bundleRoot || path.resolve(projectRoot, libConfig.srcDir || '');
    const bundleEntryFile = rollupConfigOptions.bundleEntryFile || libConfig.entry || 'index.js';
    const bundleEntryPath = path.resolve(bundleRoot, bundleEntryFile);

    const libraryTarget = rollupConfigOptions.bundleLibraryTarget || libConfig.libraryTarget;
    if (!libraryTarget) {
        throw new Error(`The 'libraryTarget' is required in lib config.`);
    }

    let format: rollup.Format;
    if (libraryTarget === 'commonjs' || libraryTarget === 'commonjs2') {
        format = 'cjs';
    } else {
        format = libraryTarget as rollup.Format;
    }

    if (!rollupConfigOptions.bundleOutFileName) {
        throw new Error(`The 'rollupConfigOptions.bundleOutFileName' is required.`);
    }

    if (!rollupConfigOptions.silent) {
        let msg = 'Using rollup lib config:';
        msg += ` main entry - ${bundleEntryFile}`;
        if (libConfig.platformTarget) {
            msg += `, platform target - ${libConfig.platformTarget}`;
        }
        msg += `, library format - ${format}`;
        if (Object.keys(environment)) {
            msg += `, environment - ${JSON.stringify(environment)}`;
        }
        logger.logLine(msg);
    }

    const bundleDestFilePath = path.resolve(projectRoot,
        libConfig.outDir,
        rollupConfigOptions.bundleOutDir || '',
        rollupConfigOptions.bundleOutFileName);

    const moduleName = libConfig.libraryName || rollupConfigOptions.packageName;
    const rollupExternalMap = {
        externals: [] as string[],
        globals: {}
    };
    mapToRollupGlobalsAndExternals(libConfig.externals, rollupExternalMap);
    if (rollupExternalMap.globals) {
        rollupExternalMap.externals = rollupExternalMap.externals || [];
        Object.keys(rollupExternalMap.globals).forEach((key: string) => {
            if (rollupExternalMap.externals.indexOf(key) === -1) {
                rollupExternalMap.externals.push(key);
            }
        });
    }
    let externals = rollupExternalMap.externals || [];
    // When creating a UMD, we want to exclude tslib from the `external` bundle option so that it
    // is inlined into the bundle.
    if (format === 'umd') {
        externals = externals.filter(key => key !== 'tslib');
    }

    const rawBanner = libConfig.banner
        ? prepareBannerSync(projectRoot, libConfig.srcDir || '', libConfig.banner)
        : undefined;
    const plugins: any[] = [];
    const isTsEntry = /\.ts$/i.test(bundleEntryFile);

    let stylePreprocessorIncludePaths: string[] = [];
    if (libConfig.stylePreprocessorOptions && libConfig.stylePreprocessorOptions.includePaths) {
        stylePreprocessorIncludePaths =
            libConfig.stylePreprocessorOptions.includePaths.map(p => path.resolve(projectRoot,
                libConfig.srcDir || '',
                p));
    }

    if (rollupConfigOptions.inlineResources !== false) {
        const inlineIncludes = isTsEntry
            ? [path.join(bundleRoot, '**/*.ts')]
            : [path.join(bundleRoot, '**/*.js')];

        const inlineUrlResolver = async (url: string, resourceId: string): Promise<string> => {
            const dir = path.parse(resourceId).dir;
            const filePath = path.resolve(dir, url);
            if (await fs.exists(filePath)) {
                return filePath;
            } else if (/\.(css|scss|sass|less)$/i.test(filePath)) {
                const failbackExts = ['.css', '.scss', '.sass', '.less'];
                const curExt = path.parse(filePath).ext;
                for (let ext of failbackExts) {
                    if (ext === curExt) {
                        continue;
                    }
                    const tempNewFilePath = filePath.substr(0, filePath.length - curExt.length) + ext;
                    if (await fs.exists(tempNewFilePath)) {
                        return tempNewFilePath;
                    }
                }
            }
            if (/\.js$/i.test(resourceId)) {
                // const rootOutDir = path.resolve(projectRoot, libConfig.outDir);
                const rootOutDir = bundleRoot;
                const relOutPath = path.relative(rootOutDir, dir);
                const tempFilePath = path.resolve(projectRoot, libConfig.srcDir || '', relOutPath, url);
                if (await fs.exists(tempFilePath)) {
                    return tempFilePath;
                } else if (/\.(css|scss|sass|less)$/i.test(tempFilePath)) {
                    const failbackExts = ['.css', '.scss', '.sass', '.less'];
                    const curExt = path.parse(tempFilePath).ext;
                    for (let ext of failbackExts) {
                        if (ext === curExt) {
                            continue;
                        }
                        const tempNewFilePath = tempFilePath.substr(0, tempFilePath.length - curExt.length) + ext;
                        if (await fs.exists(tempNewFilePath)) {
                            return tempNewFilePath;
                        }
                    }
                }
            }

            return filePath;
        };

        plugins.push(ngResourceInline({
            include: inlineIncludes,
            processTemplateUrl: async (url: string, resourceId: string) => {
                if (/\.html$/i.test(url)) {
                    const templateFilePath = await inlineUrlResolver(url, resourceId);
                    const templateContent = await fs.readFile(templateFilePath, 'utf-8');
                    return minifyHtml(templateContent,
                        {
                            caseSensitive: true,
                            collapseWhitespace: true,
                            removeComments: true,
                            keepClosingSlash: true,
                            removeAttributeQuotes: false
                        });
                }

                return null;
            },
            processStyleUrls: async (urls: string[], resourceId: string) => {
                const processPostCss = async (css: string, from: string): Promise<string> => {
                    const result = await postcss([
                        postcssUrl({
                            url: 'inline'
                        }),
                        autoprefixer,
                        cssnano({
                            // autoprefixer: false,
                            safe: true,
                            mergeLonghand: false,
                            discardComments: {
                                removeAll: true
                            }
                        })
                    ])
                        .process(css,
                        {
                            from: from

                        });
                    return result.css;
                };

                const stylesContents = await Promise.all(urls.map(async (styleUrl: string) => {
                    const styleFilePath = await inlineUrlResolver(styleUrl, resourceId);

                    if (/\.scss$|\.sass$/i.test(styleFilePath)) {
                        const result = await sassPromise({
                            file: styleFilePath,
                            includePaths: stylePreprocessorIncludePaths
                        });
                        return await processPostCss(result.css.toString(), styleFilePath);
                    } else if (/\.less$/i.test(styleFilePath)) {
                        const styleContent = await fs.readFile(styleFilePath, 'utf-8');
                        const result = await less.render(styleContent, { filename: styleFilePath });
                        return await processPostCss(result.css.toString(), styleFilePath);
                    } else if (/\.css/i.test(styleFilePath)) {
                        const styleContent = await fs.readFile(styleFilePath, 'utf-8');
                        return await processPostCss(styleContent, styleFilePath);
                    } else {
                        throw new Error(`Couldn't inline style: ${styleUrl}, unsupported style format.`);
                    }
                }));
                return stylesContents;
            }
        }) as any);
    }

    if (isTsEntry) {
        // ReSharper disable once CommonJsExternalModule
        const typescript = require('rollup-plugin-typescript2');

        const tsConfigPath = path.resolve(projectRoot, libConfig.srcDir || '', libConfig.tsconfig || 'tsconfig.json');
        // rollup-plugin-typescript@0.8.1 doesn't support custom tsconfig path
        // so we use rollup-plugin-typescript2
        plugins.push(typescript({
            tsconfig: tsConfigPath
        }));
    }

    if (format === 'umd' || rollupConfigOptions.useNodeResolve) {
        plugins.push(rollupNodeResolve({
            jsnext: true
        }));

        // plugins.push(rollupInject({
        //    exclude: 'node_modules/**',
        //    modules: _.mapValues(tslib,
        //        (value: any, key: string) => ['tslib', key])
        // }));
    }

    const inputOptions: RollupInputOptions = {
        input: bundleEntryPath,
        // exports: 'named',
        external: externals,
        plugins: plugins,
        onwarn(warning: rollup.Warning): void {
            // Skip certain warnings

            // should intercept ... but doesn't in some rollup versions
            if (warning.code === 'THIS_IS_UNDEFINED') {
                return;
            }

            // console.warn everything else
            logger.warnLine(warning.message);
        }
    };

    const outputOptions: RollupOutputOptions = {
        name: moduleName,
        format: format,
        globals: rollupExternalMap.globals,
        // suitable if you're exporting more than one thing
        exports: 'named',
        banner: rawBanner,
        file: bundleDestFilePath,
        sourcemap: libConfig.sourceMap
    };

    return {
        inputOptions: inputOptions,
        outputOptions: outputOptions
    };
}

function mapToRollupGlobalsAndExternals(externals: any,
    mapResult: { externals: string[], globals: { [key: string]: string } },
    subExternals?: any): void {
    if (externals) {
        if (Array.isArray(externals)) {
            externals.forEach((external: any) => {
                mapToRollupGlobalsAndExternals(externals, mapResult, external);
            });
        } else {
            subExternals = subExternals || externals;
            if (typeof subExternals === 'object') {
                Object.keys(subExternals).forEach((k: string) => {
                    const tempValue = subExternals[k];
                    if (typeof tempValue === 'object') {
                        const firstKey = Object.keys(tempValue)[0];
                        mapResult.globals = mapResult.globals || {};
                        mapResult.globals[k] = tempValue[firstKey];

                    } else if (typeof tempValue === 'string') {
                        mapResult.globals = mapResult.globals || {};
                        mapResult.globals[k] = tempValue;
                    } else {
                        mapResult.externals = mapResult.externals || [];
                        mapResult.externals.push(k);
                    }
                });
            } else if (typeof subExternals === 'string') {
                mapResult.externals = mapResult.externals || [];
                mapResult.externals.push(subExternals);
            }
        }
    }
}
