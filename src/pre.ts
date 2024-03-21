import {core, io} from './const';

try {
  io.which('docker', true);
  core.info('docker command OK!');
} catch {
  core.setFailed('docker: command not found');
}
