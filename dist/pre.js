"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = require("./const");
try {
    const_1.io.which('docker', true);
    const_1.core.info('docker command OK!');
}
catch (_a) {
    const_1.core.setFailed('docker: command not found');
}
