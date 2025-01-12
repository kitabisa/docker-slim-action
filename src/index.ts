import {
  cache, core, fs, https, io,
  os, path, shell, TMP_DIR
} from './const';

const inputOverwrite = core.getBooleanInput('overwrite', {required: false});
const inputTarget = core.getInput('target', {required: true});
const inputVersion = core.getInput('version', {required: false});
let inputTag = core.getInput('tag', {required: true});

let SLIM_PATH = '';

async function get_slim() {
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
  const response = await new Promise((resolve, reject) => {
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
  
  try {
    if (inputVersion == "" || inputVersion == "latest") {
      VER = response[0].tag_name;
    } else {
      VER = inputVersion;
    }
  } catch {
    throw new Error(`Could not get the Slim version ${VER}.`);
  }
  
  URL = `https://github.com/slimtoolkit/slim/releases/download/${VER}`;

  // Get kernel name and machine architecture.
  KERNEL = os.platform();
  MACHINE = os.arch();

  // Determine the target distribution
  if (KERNEL === 'linux') {
    EXT = 'tar.gz';
    if (MACHINE === 'x64') {
      DIST = 'linux';
    } else if (MACHINE === 'arm') {
      DIST = 'linux_arm';
    } else if (MACHINE === 'arm64') {
      DIST = 'linux_arm64';
    }
  } else if (KERNEL === 'darwin') {
    EXT = 'zip';
    if (MACHINE === 'x64') {
      DIST = 'mac';
    } else if (MACHINE === 'arm64') {
      DIST = 'mac_m1';
    }
  } else {
    throw new Error(`${KERNEL} is not a supported platform.`);
  }

  // Was a known distribution detected?
  if (!DIST) {
    throw new Error(`${MACHINE} is not a supported architecture.`);
  }

  // Derive the filename
  FILENAME = `dist_${DIST}.${EXT}`;

  // Get the bin from cache
  const cachePrefix = `slim-${VER}`;
  const cacheKey = `${cachePrefix}-${DIST}`;
  const cachePath = path.join('/tmp', cacheKey);

  try {
    core.debug('Restoring cache');
    const cacheResult = await cache.restoreCache(
      [ cachePath ], cacheKey, [ `${cachePrefix}-` ]
    );

    if (typeof cacheResult === 'undefined') {
      throw new Error(`Cache miss: ${cacheKey} was not found in the cache.`)
    }

    core.debug(`${cacheKey} cache was restored.`)

    SLIM_PATH = cachePath;
  } catch (e) {
    core.error(e);

    const file = fs.createWriteStream(path.join(TMP_DIR, FILENAME));
    await new Promise((resolve, reject) => {
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
      await extract(path.join(TMP_DIR, FILENAME), {
        dir: TMP_DIR
      });
    } else if (EXT === 'tar.gz') {
      const tar = require('tar');
      await tar.x({
        file: path.join(TMP_DIR, FILENAME),
        cwd: TMP_DIR
      });
    } else {
      throw new Error('Unexpected file extension.');
    }

    SLIM_PATH = path.join(TMP_DIR, `dist_${DIST}`);

    core.debug(`Copying ${SLIM_PATH} -> (${cachePath})`);
    await io.cp(SLIM_PATH, cachePath, { recursive: true, force: true });

    const cacheId = await cache.saveCache([ cachePath ], cacheKey);
    core.debug(`${cacheKey} cache saved (ID: ${cacheId})`);
  } finally {
    core.addPath(SLIM_PATH);
    core.info(`Using slim version ${VER}`);
  }
}

async function run() {
  core.debug('Downloading slim');
  await get_slim();

  core.info(`slim on target: ${inputTarget}`);

  let args = ['b', '--target', inputTarget];

  if (process.env['DSLIM_HTTP_PROBE_OFF'] == 'true' || process.env['DSLIM_HTTP_PROBE'] == 'false') {
    if (typeof process.env['DSLIM_CONTINUE_AFTER'] === 'undefined') args.push('--continue-after', '1')
  }

  await shell.exec('slim', args, {cwd: SLIM_PATH});

  const data = fs.readFileSync(path.join(SLIM_PATH, 'slim.report.json'));
  const report = JSON.parse(data);

  core.setOutput('report', report);

  if (report.state == 'error') {
    throw new Error('Cannot build over target');
  }

  const [image, tag] = report.target_reference.split(':');

  if (inputOverwrite && tag) {
    core.info(`Overwriting ${image}:${tag} with slimmed version`);
    inputTag = tag

    await shell.exec('docker image', ['rm', report.target_reference]);
  }

  await shell.exec('docker tag', [report.minified_image, `${image}:${inputTag}`]);
  await shell.exec('docker image', ['rm', report.minified_image]);
}

if (inputTag == "") {
  core.setFailed('Tag cannot be empty.');
}

try {
  run();
} catch(e) {
  core.setFailed(e);
}
