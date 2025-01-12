"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = require("./const");
const inputOverwrite = const_1.core.getBooleanInput('overwrite', { required: false });
const inputTarget = const_1.core.getInput('target', { required: true });
const inputVersion = const_1.core.getInput('version', { required: false });
let inputTag = const_1.core.getInput('tag', { required: true });
function get_slim() {
    return __awaiter(this, void 0, void 0, function* () {
        let DIST = '';
        let EXT = '';
        let FILENAME = '';
        let KERNEL = '';
        let MACHINE = '';
        let URL = '';
        let VER = '';
        // Get the current released tag_name
        const options = {
            hostname: 'api.github.com',
            path: '/repos/slimtoolkit/slim/releases',
            headers: { 'User-Agent': 'Mozilla/5.0' },
        };
        const response = yield new Promise((resolve, reject) => {
            const_1.https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve(JSON.parse(data));
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
        try {
            if (inputVersion == "" || inputVersion == "latest") {
                VER = response[0].tag_name;
            }
            else {
                VER = inputVersion;
            }
        }
        catch (_a) {
            throw new Error(`Could not get the Slim version ${VER}.`);
        }
        // Get kernel name and machine architecture.
        KERNEL = const_1.os.platform();
        MACHINE = const_1.os.arch();
        // Determine the target distribution
        if (KERNEL === 'linux') {
            EXT = 'tar.gz';
            if (MACHINE === 'x64') {
                DIST = 'linux';
            }
            else if (MACHINE === 'arm') {
                DIST = 'linux_arm';
            }
            else if (MACHINE === 'arm64') {
                DIST = 'linux_arm64';
            }
        }
        else if (KERNEL === 'darwin') {
            EXT = 'zip';
            if (MACHINE === 'x64') {
                DIST = 'mac';
            }
            else if (MACHINE === 'arm64') {
                DIST = 'mac_m1';
            }
        }
        else {
            throw new Error(`${KERNEL} is not a supported platform.`);
        }
        // Was a known distribution detected?
        if (!DIST) {
            throw new Error(`${MACHINE} is not a supported architecture.`);
        }
        // Derive the filename
        FILENAME = `dist_${DIST}.${EXT}`;
        URL = `https://github.com/slimtoolkit/slim/releases/download/${VER}/${FILENAME}`;
        const_1.core.debug(`Checking cache for slim...`);
        let slimPath = const_1.tc.find('slim', VER, MACHINE);
        if (slimPath) {
            const_1.core.notice(`slim ${VER} found in cache`);
        }
        else {
            const parentWorkspace = const_1.path.join(process.env.GITHUB_WORKSPACE, '../');
            let srcPath;
            try {
                const_1.core.debug(`Downloading slim ${VER} for ${KERNEL}/${MACHINE}...`);
                srcPath = yield const_1.tc.downloadTool(URL);
            }
            catch (error) {
                throw new Error(`Could not download slim: ${error.message}`);
            }
            let extractedPath;
            try {
                const_1.core.debug(`Extracting slim ${VER}...`);
                if (EXT === 'zip') {
                    extractedPath = yield const_1.tc.extractZip(srcPath, parentWorkspace);
                }
                else { // tar.gz
                    extractedPath = yield const_1.tc.extractTar(srcPath, parentWorkspace);
                }
            }
            catch (error) {
                throw new Error(`Could not extract slim: ${error.message}`);
            }
            extractedPath = const_1.path.join(extractedPath, DIST);
            const_1.core.debug('Caching slim...');
            slimPath = yield const_1.tc.cacheDir(extractedPath, 'slim', VER, MACHINE);
        }
        const_1.core.debug('Adding slim to PATH...');
        const_1.core.addPath(slimPath);
        const_1.core.info(`slim ${VER} has been installed successfully`);
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const_1.core.debug('Downloading slim');
        yield get_slim();
        const_1.core.info(`slim on target: ${inputTarget}`);
        let args = ['b', '--target', inputTarget];
        if (process.env['DSLIM_HTTP_PROBE_OFF'] == 'true' || process.env['DSLIM_HTTP_PROBE'] == 'false') {
            if (typeof process.env['DSLIM_CONTINUE_AFTER'] === 'undefined')
                args.push('--continue-after', '1');
        }
        yield const_1.shell.exec('slim', args, { cwd: const_1.TMP_DIR });
        const data = const_1.fs.readFileSync(const_1.path.join(const_1.TMP_DIR, 'slim.report.json'));
        const report = JSON.parse(data);
        const_1.core.setOutput('report', report);
        if (report.state == 'error') {
            throw new Error('Cannot build over target');
        }
        const [image, tag] = report.target_reference.split(':');
        if (inputOverwrite && tag) {
            const_1.core.info(`Overwriting ${image}:${tag} with slimmed version`);
            inputTag = tag;
            yield const_1.shell.exec('docker image', ['rm', report.target_reference]);
        }
        yield const_1.shell.exec('docker tag', [report.minified_image, `${image}:${inputTag}`]);
        yield const_1.shell.exec('docker image', ['rm', report.minified_image]);
    });
}
if (inputTag == "") {
    const_1.core.setFailed('Tag cannot be empty.');
}
try {
    run();
}
catch (e) {
    const_1.core.setFailed(e);
}
