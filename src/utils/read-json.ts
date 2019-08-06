// tslint:disable:no-any
// tslint:disable:no-unsafe-any

import { readFile } from 'fs';

import { stripComments } from './strip-comments';

export async function readJson(filePath: string): Promise<any> {
    const content: Buffer = await new Promise((resolve, reject) => {
        readFile(filePath,
            (err, buffer) => {
                if (err) {
                    reject(err);

                    return;
                }

                resolve(buffer);
            });
    });

    const contentStr = stripComments(content.toString().replace(/^\uFEFF/, ''));

    return JSON.parse(contentStr);
}
