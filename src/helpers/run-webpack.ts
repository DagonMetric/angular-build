import * as webpack from 'webpack';

import { LoggerBase } from '../utils/logger';

export async function runWebpack(
    wpConfig: webpack.Configuration | webpack.Configuration[],
    watch: boolean,
    logger: LoggerBase): Promise<{}> {
    const firstConfig = Array.isArray(wpConfig) ? wpConfig[0] : wpConfig;
    const statsOptions = firstConfig.stats;
    const watchOptions = firstConfig.watchOptions;
    if (Array.isArray(wpConfig) &&
        wpConfig.length > 1 &&
        statsOptions &&
        typeof statsOptions === 'object' &&
        !statsOptions.children) {
        statsOptions.children = true; // wpConfig.map((o: webpack.Configuration) => o.stats) as any;
    }

    const webpackCompiler = webpack(wpConfig as webpack.Configuration);

    // tslint:disable-next-line:promise-must-complete
    return new Promise((resolve, reject) => {
        const callback: webpack.Compiler.Handler = (err: Error, stats: webpack.Stats) => {
            if (err) {
                reject(err);

                return;
            }

            if (watch) {
                return;
            }

            if (stats.hasErrors()) {
                logger.error(stats.toString('errors-only'));

                reject();

                return;
            } else {
                if (statsOptions) {
                    const result = stats.toString(statsOptions);
                    if (result && result.trim()) {
                        logger.info(result);
                    }
                }
                resolve();
            }
        };

        if (watch) {
            webpackCompiler.watch(watchOptions || {}, callback);
            logger.info('\nWebpack is watching the files…\n');
        } else {
            webpackCompiler.run(callback);
        }
    });
}
