import {core, io, TMP_DIR} from './const';

core.info(`Cleaning up ${TMP_DIR}`);
io.rmRF(TMP_DIR);