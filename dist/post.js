"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = require("./const");
const_1.core.info(`Cleaning up ${const_1.TMP_DIR}`);
const_1.io.rmRF(const_1.TMP_DIR);
