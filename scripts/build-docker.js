const spawnSync = require('child_process').spawnSync;
const meta = require('../package');

process.chdir(__dirname);
process.chdir('..');

console.log('Check Docker Machine.');
const machineVersion = spawnSync('docker-machine', ['version']);
const machineExists = machineVersion.pid > 0;
console.log('Docker Machine:', machineExists);
console.log();

let dockerConfig = [];
if (machineExists) {
  console.log('Start Docker Machine.');
  spawnSync('docker-machine', ['start'], { stdio: 'inherit' });
  console.log();
  
  console.log('Get Docker Machine configuration.');
  const machineConfig = spawnSync('docker-machine', ['config'], { encoding: 'utf8' });
  dockerConfig = (machineConfig.stdout || '').split('\n').filter(o => o);
  console.log();
}

console.log('Build Docker image.')
const dockerImageTag = `${meta.name}:${meta.version}`;
console.log('Docker image tag:', dockerImageTag);
const dockerBuildArgs = [...dockerConfig, 'build', '-t', dockerImageTag, '.'];
const dockerBuildRet = spawnSync('docker', dockerBuildArgs, { stdio: 'inherit' });
if (dockerBuildRet.status) {
  console.error('Error code:', dockerBuildRet.status);
  return console.log();
}
console.log();
