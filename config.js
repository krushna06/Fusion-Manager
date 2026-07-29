import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.resolve('./config/config.json'), 'utf-8'));
const roles = JSON.parse(fs.readFileSync(path.resolve('./config/roles.json'), 'utf-8'));
const channels = JSON.parse(fs.readFileSync(path.resolve('./config/channels.json'), 'utf-8'));

export default { ...config, roles, channels };
