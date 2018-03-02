import * as path from 'path';

import { ParsedCommandLine } from 'typescript';

import {
    AngularBuildContext,
    InvalidConfigError,
    LibProjectConfigInternal,
    TsTranspilationOptionsInternal,
    TypescriptCompileError
} from '../models';

import { Logger } from '../utils/logger';

import { processNgResources } from './process-ng-resources';

const spawn = require('cross-spawn');
const { exists } = require('fs-extra');

export async function performNgc(angularBuildContext: AngularBuildContext, customLogger?: Logger): Promise<void> {
    const libConfig = angularBuildContext.projectConfig as LibProjectConfigInternal;
    if (!libConfig.tsTranspilation) {
        return;
    }

    const projectRoot = AngularBuildContext.projectRoot;
    const logger = customLogger ? customLogger : AngularBuildContext.logger;

    const tsTranspilation = libConfig.tsTranspilation as TsTranspilationOptionsInternal;
    const tsConfigPath = tsTranspilation._tsConfigPath;

    if (!tsConfigPath) {
        throw new InvalidConfigError(`The 'libs[${libConfig._index
            }].tsTranspilation.tsconfig' value is required.`);
    }

    let ngcCommandPath = 'ngc';
    if (AngularBuildContext.nodeModulesPath &&
        await exists(path.join(AngularBuildContext.nodeModulesPath, '.bin/ngc'))) {
        ngcCommandPath = path.join(AngularBuildContext.nodeModulesPath, '.bin/ngc');
    } else if (AngularBuildContext.cliRootPath && await exists(path.join(AngularBuildContext.cliRootPath, 'node_modules/.bin/ngc'))) {
        ngcCommandPath = path.join(AngularBuildContext.cliRootPath, 'node_modules/.bin/ngc');
    } else if (AngularBuildContext.nodeModulesPath &&
        await exists(path.join(AngularBuildContext.nodeModulesPath,
            '@bizappframework/angular-build/node_modules/.bin/ngc'))) {
        ngcCommandPath = path.join(AngularBuildContext.nodeModulesPath,
            '@bizappframework/angular-build/node_modules/.bin/ngc');
    }

    if (!await exists(ngcCommandPath)) {
        let internalNodeModulePath = path.dirname(require.resolve('@angular/compiler-cli'));
        while (internalNodeModulePath &&
            !/node_modules$/i.test(internalNodeModulePath) &&
            internalNodeModulePath !== path.dirname(internalNodeModulePath)) {
            internalNodeModulePath = path.dirname(internalNodeModulePath);
        }
        ngcCommandPath = path.join(internalNodeModulePath, '.bin/ngc');
    }

    const srcDir = path.resolve(projectRoot, libConfig.srcDir || '');
    const tsCompilerConfig = tsTranspilation._tsCompilerConfig as ParsedCommandLine;
    const compilerOptions = tsCompilerConfig.options;
    const tsOutDir = tsTranspilation._tsOutDir as string;
    const copyTemplateAndStyleUrls = tsTranspilation.copyTemplateAndStyleUrls;
    const inlineMetaDataResources = tsTranspilation.inlineMetaDataResources;
    const stylePreprocessorOptions = libConfig.stylePreprocessorOptions;
    const flatModuleOutFile =
        tsTranspilation._angularCompilerOptions && tsTranspilation._angularCompilerOptions.flatModuleOutFile
            ? tsTranspilation._angularCompilerOptions.flatModuleOutFile
            : '';

    const commandArgs: string[] = ['-p', tsConfigPath];

    if (!compilerOptions.outDir) {
        commandArgs.push('--outDir');
        commandArgs.push(tsOutDir);
    }

    if (libConfig.sourceMap && !compilerOptions.sourceMap) {
        commandArgs.push('--sourceMap');
    }
    if (tsTranspilation.i18nFile) {
        commandArgs.push('--i18nFile');
        commandArgs.push(tsTranspilation.i18nFile);
    }
    if (tsTranspilation.i18nFormat) {
        commandArgs.push('--i18nFormat');
        commandArgs.push(tsTranspilation.i18nFormat);
    }
    if (tsTranspilation.locale) {
        commandArgs.push('--locale');
        commandArgs.push(tsTranspilation.locale);
    }
    if (tsTranspilation.missingTranslation) {
        commandArgs.push('--missingTranslation');
        commandArgs.push(tsTranspilation.missingTranslation);
    }
    if (tsTranspilation.i18nOutFile) {
        commandArgs.push('--i18nOutFile');
        commandArgs.push(tsTranspilation.i18nOutFile);
    }
    if (tsTranspilation.i18nOutFormat) {
        commandArgs.push('--i18nOutFormat');
        commandArgs.push(tsTranspilation.i18nOutFormat);
    }

    logger.info(`Compiling typescript with ${path.relative(projectRoot, tsConfigPath)}`);

    await new Promise((resolve, reject) => {
        const errors: string[] = [];
        const child = spawn(ngcCommandPath, commandArgs, {});
        child.stdout.on('data', (data: any) => {
            logger.debug(`${data}`);
        });
        child.stderr.on('data', (data: any) => errors.push(data.toString().trim()));
        child.on('error', (err: Error) => reject(err));
        child.on('exit', (exitCode: number) => {
            if (exitCode === 0) {
                if (copyTemplateAndStyleUrls || inlineMetaDataResources) {
                    logger.debug('Processing template and style urls');

                    let stylePreprocessorIncludePaths: string[] = [];
                    if (stylePreprocessorOptions &&
                        stylePreprocessorOptions.includePaths) {
                        stylePreprocessorIncludePaths =
                            stylePreprocessorOptions.includePaths
                                .map(p => path.resolve(srcDir, p));
                    }

                    processNgResources(
                        srcDir,
                        tsOutDir,
                        `${path.join(tsOutDir, '**/*.js')}`,
                        stylePreprocessorIncludePaths,
                        copyTemplateAndStyleUrls,
                        inlineMetaDataResources,
                        flatModuleOutFile
                            ? flatModuleOutFile.replace(/\.js$/i, '.metadata.json')
                            : '')
                        .then(() => {
                            resolve();
                        }).catch(err => reject(err));
                } else {
                    resolve();
                }

            } else {
                reject(new TypescriptCompileError(errors.join('\n')));
            }

        });
    });
}
