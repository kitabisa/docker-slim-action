import {
  core, fs, https,
  os, path, shell,
  tc, TMP_DIR
} from './const';

const inputOverwrite = core.getBooleanInput('overwrite', {required: false});
const inputTarget = core.getInput('target', {required: true});
const inputVersion = core.getInput('version', {required: false});
let inputTag = core.getInput('tag', {required: true});

async function get_slim() {
  let DIST = 'dist_';
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

  // Get kernel name and machine architecture.
  KERNEL = os.platform();
  MACHINE = os.arch();

  // Determine the target distribution
  if (KERNEL === 'linux') {
    EXT = 'tar.gz';
    if (MACHINE === 'x64') {
      DIST += 'linux';
    } else if (MACHINE === 'arm') {
      DIST += 'linux_arm';
    } else if (MACHINE === 'arm64') {
      DIST += 'linux_arm64';
    }
  } else if (KERNEL === 'darwin') {
    EXT = 'zip';
    if (MACHINE === 'x64') {
      DIST += 'mac';
    } else if (MACHINE === 'arm64') {
      DIST += 'mac_m1';
    }
  } else {
    throw new Error(`${KERNEL} is not a supported platform.`);
  }

  // Was a known distribution detected?
  if (DIST == 'dist_') {
    throw new Error(`${MACHINE} is not a supported architecture.`);
  }

  // Derive the filename
  FILENAME = `${DIST}.${EXT}`;
  URL = `https://github.com/slimtoolkit/slim/releases/download/${VER}/${FILENAME}`;

  core.debug(`Checking cache for slim...`)
  let slimPath = tc.find('slim', VER, MACHINE)

  if (slimPath) {
    core.notice(`slim ${VER} found in cache`)
  } else {
    const parentWorkspace = path.join(process.env.GITHUB_WORKSPACE, '../')

    let srcPath
    try {
      core.debug(`Downloading slim ${VER} for ${KERNEL}/${MACHINE}...`)
      srcPath = await tc.downloadTool(URL)
    } catch (error) {
      throw new Error(`Could not download slim: ${error.message}`)
    }

    let extractedPath
    try {
      core.debug(`Extracting slim ${VER}...`)
      if (EXT === 'zip') {
        extractedPath = await tc.extractZip(srcPath, parentWorkspace)
      } else { // tar.gz
        extractedPath = await tc.extractTar(srcPath, parentWorkspace)
      }
    } catch (error) {
      throw new Error(`Could not extract slim: ${error.message}`)
    }
    extractedPath = path.join(extractedPath, DIST)

    core.debug('Caching slim...')
    slimPath = await tc.cacheDir(extractedPath, 'slim', VER, MACHINE)
  }

  core.debug('Adding slim to PATH...')
  core.addPath(slimPath)
  core.info(`slim ${VER} has been installed successfully`)
}

async function run() {
  core.debug('Downloading slim');
  await get_slim();

  core.info(`slim on target: ${inputTarget}`);

  let args = ['b', '--target', inputTarget];

  if (process.env['DSLIM_HTTP_PROBE_OFF'] == 'true' || process.env['DSLIM_HTTP_PROBE'] == 'false') {
    if (typeof process.env['DSLIM_CONTINUE_AFTER'] === 'undefined') args.push('--continue-after', '1')
  }

  await shell.exec('slim', args, {cwd: TMP_DIR});

  const data = fs.readFileSync(path.join(TMP_DIR, 'slim.report.json'));
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
