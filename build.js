const path = require('path');
const fs = require('fs');
const jsonRefs = require('json-refs');
const YAML = require('js-yaml');
const watch = require('node-watch');
const walkSync = require('walk-sync');

const srcRoot = path.join(__dirname, 'src');
const tgtRoot = path.join(__dirname, 'build');
const webRoot = path.join(__dirname, 'docs');
const autoGenIndex = [path.join(srcRoot, 'definitions')];

const options = {
    filter: 'relative',
    loaderOptions: {
        processContent: (content, callback) => {
            callback(null, YAML.safeLoad(content.text));
        }
    },
};

build();

if (process.argv.length > 2 && process.argv[2] === 'watch') {
    console.log("Watching…");
    watch(srcRoot, fileName => {
        if (autoGenIndex.some(d => fileName === path.join(d, 'index.yaml'))) {
            return;
        }
        build();
    });
}

function build() {
    console.info(new Date().toLocaleString(), "Rebuild");
    autoGenIndex.forEach(dir => {
        const files = walkSync(dir, {directories: false, globs: ['**/*.yaml'], ignore: ['index.yaml']});
        const index = {};
        files.forEach(f => {
            const base = path.basename(f, '.yaml');
            index[base] = {['$ref']: f};
        });
        const yaml = YAML.safeDump(index);
        fs.writeFileSync(path.join(dir, 'index.yaml'), `# THIS FILE IS AUTO GENERATED\n${yaml}`);
    });
    jsonRefs.clearCache();
    //noinspection JSCheckFunctionSignatures
    jsonRefs
        .resolveRefsAt(path.join(srcRoot, 'index.yaml'), options)
        .then(results => {
            const yaml = YAML.safeDump(results.resolved);
            fs.writeFileSync(path.join(tgtRoot, 'swagger.yaml'), `# THIS FILE IS AUTO GENERATED\n${yaml}`);
            fs.writeFileSync(path.join(webRoot, 'swagger.yaml'), `# THIS FILE IS AUTO GENERATED\n${yaml}`);
        })
        .catch(err => console.error('Error:', err));
}
