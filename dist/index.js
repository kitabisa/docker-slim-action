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
let inputTag = const_1.core.getInput('tag', { required: false });
let SLIM_PATH = '';
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
                VER = inputTag;
            }
        }
        catch (_a) {
            throw new Error('ERROR! Could not retrieve the current Slim version number.');
        }
        URL = `https://downloads.dockerslim.com/releases/${VER}`;
        // Get kernel name and machine architecture.
        KERNEL = const_1.os.platform();
        MACHINE = const_1.os.arch();
        // Determine the target distrubution
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
            throw new Error(`ERROR! ${KERNEL} is not a supported platform.`);
        }
        // Was a known distribution detected?
        if (!DIST) {
            throw new Error(`ERROR! ${MACHINE} is not a supported architecture.`);
        }
        // Derive the filename
        FILENAME = `dist_${DIST}.${EXT}`;
        const file = const_1.fs.createWriteStream(const_1.path.join(const_1.TMP_DIR, FILENAME));
        yield new Promise((resolve, reject) => {
            const_1.https.get(`${URL}/${FILENAME}`, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(file);
                });
            }).on('error', (error) => {
                const_1.fs.unlinkSync(const_1.path.join(const_1.TMP_DIR, FILENAME));
                reject(error);
            });
        });
        const_1.core.debug(`Unpacking ${const_1.path.join(const_1.TMP_DIR, FILENAME)}`);
        if (EXT === 'zip') {
            const extract = require('extract-zip');
            yield extract(const_1.path.join(const_1.TMP_DIR, FILENAME), {
                dir: const_1.TMP_DIR
            });
        }
        else if (EXT === 'tar.gz') {
            const tar = require('tar');
            yield tar.x({
                file: const_1.path.join(const_1.TMP_DIR, FILENAME),
                cwd: const_1.TMP_DIR
            });
        }
        else {
            throw new Error('ERROR! Unexpected file extension.');
        }
        SLIM_PATH = const_1.path.join(const_1.TMP_DIR, `dist_${DIST}`);
        const_1.core.addPath(SLIM_PATH);
        const_1.core.info(`Using slim version ${VER}`);
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const_1.core.debug('Downloading slim');
        yield get_slim();
        const_1.core.info(`slim on target: ${inputTarget}`);
        yield const_1.shell.exec('slim', ['b', '--target', inputTarget, '--continue-after', '1'], { cwd: SLIM_PATH });
        const data = const_1.fs.readFileSync(const_1.path.join(SLIM_PATH, 'slim.report.json'));
        const report = JSON.parse(data);
        const_1.core.setOutput('report', report);
        if (report.state == 'error') {
            throw new Error('ERROR! Cannot build over target');
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
    const_1.core.setFailed('ERROR! Tag cannot be empty.');
}
try {
    run();
}
catch (e) {
    const_1.core.setFailed(e);
}
