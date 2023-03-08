import {core, io} from './const';

try {
  io.which('docker', true);
  core.info('docker command OK!');
} catch {
  core.setFailed('ERROR! docker: command not found');
}
