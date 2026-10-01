import { spawnSync } from 'node:child_process';

const PROBE = `
import { verbose, debug, info, success, load, error, LOG_LEVELS } from './utils/logger.js';
console.log('LEVEL=' + LOG_LEVELS.VERBOSE);
verbose('NOISE_VERBOSE');
debug('DEBUG_LINE');
info('INFO_LINE');
success('SUCCESS_LINE');
load('LOAD_LINE');
error('ERROR_LINE');
`;

const checks = [];
const check = (label, ok, detail = '') => {
  checks.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` - ${detail}` : ''}`);
};

function run(env) {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', PROBE], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
  return (r.stdout || '') + (r.stderr || '');
}

const def = run({ VERBOSE_LOGGING: '' });
const verb = run({ VERBOSE_LOGGING: 'true' });

check('default: verbose() is silent', !def.includes('NOISE_VERBOSE'));

check('default: debug() behaviour unchanged (prints)', def.includes('DEBUG_LINE'));

check('default: info() still prints', def.includes('INFO_LINE'));
check('default: success() still prints', def.includes('SUCCESS_LINE'));
check('default: load() still prints', def.includes('LOAD_LINE'));
check('default: error() still prints', def.includes('ERROR_LINE'));

check('VERBOSE_LOGGING=true: verbose() prints', verb.includes('NOISE_VERBOSE'));
check('VERBOSE_LOGGING=true: info() still prints', verb.includes('INFO_LINE'));

import fs from 'node:fs';
const poller = fs.readFileSync('handlers/litebansPoller.js', 'utf8');
const ready = fs.readFileSync('events/client/ready.js', 'utf8');

check('poller has no raw console.log left', !/console\.log/.test(poller));
check('poller routes its notices through verbose()', /verbose\(/.test(poller));
check('ready.js routes command registration through verbose()',
  /verbose\(`Registered/.test(ready) && !/success\(`Registered/.test(ready));

const failed = checks.filter(c => !c).length;
console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : `${failed} CHECK(S) FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
