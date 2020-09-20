const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const replace = require('replace');

module.exports = (snowpackConfig, pluginOptions) => {
    let isDev = false;
    return {
        name: 'snowpack-plugin-csshash',
        async run(opts) {
            isDev = !!opts.isDev;
        },
        async optimize({ buildDirectory }) {
            if (isDev) return;

            const hashFile = async ({ filename, hashAlgorithm = 'sha256', hashLength = 0 }) => {
                const fullFilename = path.join(buildDirectory, filename);
                const hashFunction = crypto.createHash(hashAlgorithm);
                const substr = value => hashLength ? value.substring(0, hashLength) : value;
                return new Promise((resolve, reject) => {
                    fs.createReadStream(fullFilename)
                        .on('data', data => hashFunction.update(data))
                        .on('end', () => resolve(substr(hashFunction.digest('hex'))))
                        .on('error', reject);
                });
            };

            // open file, calc hash, trim hash
            const hashValue = await hashFile(pluginOptions);
            // console.log('hash', hashValue);

            // rename file
            const originalFilename = pluginOptions.filename;
            const extName = path.extname(originalFilename);
            const baseName = path.basename(originalFilename, extName);
            const dirName = path.dirname(originalFilename);
            const newBasename = `${baseName}-${hashValue}`;
            const newFilename = path.join(dirName, newBasename) + extName;
            fs.renameSync(path.join(buildDirectory, originalFilename), path.join(buildDirectory, newFilename));
            // console.log('newFilename', newFilename);

            // open html file, search for url pattern, update with new filename, save
            replace({
                regex: originalFilename,
                replacement: newFilename,
                paths: [buildDirectory],
                include: '*.html',
                recursive: true,
                silent: true,
            });

        },
    };
};
