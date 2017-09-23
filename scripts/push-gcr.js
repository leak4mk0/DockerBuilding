const spawnSync = require('child_process').spawnSync;
const meta = require(`../package`);

process.chdir(__dirname);
process.chdir('..');

const GCR_ZONE_SUBDOMAINS = ['us.', 'eu.', 'asia.', ''];

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

console.log('Get Kubernetes configuration.')
const kubeConfigRet = spawnSync('kubectl', ['config', 'current-context'], { encoding: 'utf8' });
if (kubeConfigRet.status) {
  console.error('Error code:', dockerTagRet.status);
  return console.log();
}
const kubeConfigSplit = (kubeConfigRet.stdout || '').split('\n').join('').split('_');
const kubeContext = { project: kubeConfigSplit[1], zone: kubeConfigSplit[2], cluster: kubeConfigSplit[3] };
console.log('Kubernetes project:', kubeContext.project);
console.log('Kubernetes zone:', kubeContext.zone);
console.log('Kubernetes cluster:', kubeContext.cluster);
console.log();

console.log('Create a tag to Docker image.');
const dockerImageSource = `${meta.name}:${meta.version}`;
const gcrUrl = GCR_ZONE_SUBDOMAINS.find((s) => kubeContext.zone.startsWith(s)) + 'gcr.io';
const dockerImageTarget = `${gcrUrl}/${kubeContext.project}/${dockerImageSource}`;
console.log('Docker image source:', dockerImageSource);
console.log('Docker image target:', dockerImageTarget);
const dockerTagArgs = [...dockerConfig, 'tag', dockerImageSource, dockerImageTarget];
const dockerTagRet = spawnSync('docker', dockerTagArgs, { stdio: 'inherit' });
if (dockerTagRet.status) {
  console.error('Error code:', dockerTagRet.status);
  return console.log();
}
console.log();

console.log('Push Docker image to repository.');
const gcloudPushArgs = ['docker', '--', ...dockerConfig, 'push', dockerImageTarget];
const gcloudPushRet = spawnSync('gcloud', gcloudPushArgs, { stdio: 'inherit', shell: true });
if (gcloudPushRet.status) {
  console.error('Error code:', gcloudPushRet.status);
  return console.log();
}
console.log();
