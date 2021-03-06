import * as webpack from 'webpack';

import { Logger, LogLevelString } from '../../../utils';

export interface SuppressEntryChunksWebpackPluginOptions {
    chunks?: string[];
    exclude?: string[];
    supressPattern?: RegExp;
    logLevel?: LogLevelString;
}

export interface WebpackChunk {
    name: string;
    files: string[];
}

export class SuppressEntryChunksWebpackPlugin {
    private readonly _logger: Logger;
    private readonly _options: SuppressEntryChunksWebpackPluginOptions;

    get name(): string {
        return 'suppress-entry-chunks-webpack-plugin';
    }

    constructor(options: Partial<SuppressEntryChunksWebpackPluginOptions>) {
        this._options = {
            ...options
        };

        this._logger = new Logger({
            name: `[${this.name}]`,
            logLevel: this._options.logLevel || 'info'
        });
    }

    apply(compiler: webpack.Compiler): void {
        compiler.hooks.compilation.tap(this.name, (compilation: webpack.compilation.Compilation) => {
            compilation.hooks.afterSeal.tap(this.name, (): void => {
                if (!this._options.chunks || !this._options.supressPattern || !compilation.chunks) {
                    return;
                }

                // tslint:disable-next-line: no-any
                compilation.chunks.filter((chunk: WebpackChunk) => this._options.chunks &&
                    this._options.chunks.includes(chunk.name) &&
                    (!this._options.exclude || !this._options.exclude.includes(chunk.name)))
                    .forEach((chunk: WebpackChunk) => {
                        const newFiles: string[] = [];
                        let deleted = false;
                        chunk.files.forEach((file: string) => {
                            if (this._options.supressPattern &&
                                file.match(this._options.supressPattern) &&
                                (compilation.assets as { [key: string]: string })[file]) {
                                this._logger.debug(`Deleting compilation asset - ${file}`);

                                // tslint:disable-next-line: no-dynamic-delete
                                delete (compilation.assets as { [key: string]: string })[file];
                                deleted = true;
                            } else {
                                newFiles.push(file);
                            }
                        });

                        if (deleted) {
                            chunk.files = newFiles;
                        }
                    });
            });
        });
    }
}
