"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TMP_DIR = exports.tc = exports.shell = exports.path = exports.os = exports.io = exports.https = exports.fs = exports.core = void 0;
exports.core = require('@actions/core');
exports.fs = require('fs');
exports.https = require('https');
exports.io = require('@actions/io');
exports.os = require('os');
exports.path = require('path');
exports.shell = require('@actions/exec');
exports.tc = require('@actions/tool-cache');
exports.TMP_DIR = exports.fs.mkdtempSync(exports.path.join(exports.os.tmpdir(), 'slim-'));
