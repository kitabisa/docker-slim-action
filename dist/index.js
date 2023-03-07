var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const core = require('@actions/core');
const fs = require('fs');
const github = require('@actions/github');
const https = require('https');
const io = require('@actions/io');
const os = require('os');
const path = require('path');
const shell = require('@actions/exec');
const inputOverwrite = core.getBooleanInput('overwrite', { required: false });
const inputTarget = core.getInput('target', { required: true });
let inputTag = core.getInput('tag', { required: false });
let BIN = '';
function get_slim() {
    return __awaiter(this, void 0, void 0, function* () {
        let DIST = '';
        let EXT = '';
        let FILENAME = '';
        let KERNEL = '';
        let MACHINE = '';
        let TMP_DIR = '';
        let URL = '';
        let VER = '';
        // Get the current released tag_name
        const options = {
            hostname: 'api.github.com',
            path: '/repos/slimtoolkit/slim/releases',
            headers: { 'User-Agent': 'Mozilla/5.0' },
        };
        const response = yield new Promise((resolve, reject) => {
            https.get(options, (res) => {
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
        VER = response[0].tag_name;
        if (VER) {
            URL = `https://downloads.dockerslim.com/releases/${VER}`;
        }
        else {
            throw new Error('ERROR! Could not retrieve the current Slim version number.');
        }
        // Get kernel name and machine architecture.
        KERNEL = os.platform();
        MACHINE = os.arch();
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
        core.debug(`Downloading slim version ${VER}`);
        TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'slim-'));
        const file = fs.createWriteStream(path.join(TMP_DIR, FILENAME));
        yield new Promise((resolve, reject) => {
            https.get(`${URL}/${FILENAME}`, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(file);
                });
            }).on('error', (error) => {
                fs.unlinkSync(path.join(TMP_DIR, FILENAME));
                reject(error);
            });
        });
        core.debug(`Unpacking ${path.join(TMP_DIR, FILENAME)}`);
        if (EXT === 'zip') {
            const extract = require('extract-zip');
            yield extract(path.join(TMP_DIR, FILENAME), {
                dir: TMP_DIR
            });
        }
        else if (EXT === 'tar.gz') {
            const tar = require('tar');
            yield tar.x({
                file: path.join(TMP_DIR, FILENAME),
                cwd: TMP_DIR
            });
        }
        else {
            throw new Error('ERROR! Unexpected file extension.');
        }
        core.debug('Adding to PATH');
        core.addPath(path.join(TMP_DIR, `dist_${DIST}`));
        BIN = path.join(TMP_DIR, `dist_${DIST}`, 'slim');
        core.info(`Using slim version ${VER}`);
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        core.info('Check prerequisites');
        yield pre();
        core.info('Downloading slim');
        yield get_slim();
        yield shell.exec(`${BIN}`, ['b', '--target', inputTarget, '--continue-after', '1'], { cwd: '/tmp' });
        const data = fs.readFileSync('/tmp/slim.report.json');
        const report = JSON.parse(data);
        core.setOutput('report', report);
        if (report.state == 'error') {
            throw new Error('ERROR! Cannot build over target');
        }
        const [image, tag] = report.target_reference.split(':');
        if (inputOverwrite && tag) {
            core.info(`Overwriting ${image}:${tag} with slimmed version`);
            inputTag = tag;
            yield shell.exec('docker image', ['rm', report.target_reference]);
        }
        yield shell.exec('docker tag', [report.minified_image, `${image}:${inputTag}`]);
    });
}
function pre() {
    return __awaiter(this, void 0, void 0, function* () {
        yield io.which('docker', true);
        if (inputTag == "") {
            throw new Error('ERROR! Tag cannot be empty.');
        }
    });
}
try {
    core.info(`slim on target: ${inputTarget}`);
    run();
}
catch (e) {
    core.setFailed(e);
}
