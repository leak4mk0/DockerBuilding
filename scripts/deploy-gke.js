const spawnSync = require('child_process').spawnSync;
const meta = require(`../package`);

process.chdir(__dirname);
process.chdir('..');

const GCR_SUBDOMAINS = ['us.', 'eu.', 'asia.', ''];

console.log('Get Kubernetes configuration.')
const kubeConfigRet = spawnSync('kubectl', ['config', 'current-context'], { encoding: 'utf8' });
if (kubeConfigRet.status) {
  console.error('Error code:', kubeConfigRet.status);
  return console.log();
}
const kubeConfigSplit = (kubeConfigRet.stdout || '').split('\n').join('').split('_');
const kubeContext = { project: kubeConfigSplit[1], zone: kubeConfigSplit[2], cluster: kubeConfigSplit[3] };
console.log('Kubernetes project:', kubeContext.project);
console.log('Kubernetes zone:', kubeContext.zone);
console.log('Kubernetes cluster:', kubeContext.cluster);
console.log();

console.log('Get Kubernetes deployments.')
const kubeDeploymentsRet = spawnSync('kubectl', ['get', 'deployments', '-o=json'], { encoding: 'utf8' });
if (kubeDeploymentsRet.status) {
  console.error('Error code:', kubeDeploymentsRet.status);
  return console.log();
}
const kubeDeployments = JSON.parse(kubeDeploymentsRet.stdout || '');
console.log();

console.log('Update Kubernetes deployments.');
const dockerImageSource = `${meta.name}:${meta.version}`;
const gcrUrl = GCR_SUBDOMAINS.find((s) => (kubeContext.zone.startsWith(s.replace(/\.$/, '')))) + 'gcr.io';
const dockerImageTarget = `${gcrUrl}/${kubeContext.project}/${dockerImageSource}`;
const dockerImageQuery = dockerImageTarget.replace(/:[^:]+$/, ':');
console.log('Docker image source:', dockerImageSource);
console.log('Docker image target:', dockerImageTarget);
console.log('Docker image query:', dockerImageQuery);
kubeDeployments.items.forEach((deployment) => {
  deployment.spec.template.spec.containers.forEach((container) => {
    if (!container.image.startsWith(dockerImageQuery)) {
      return;
    }
    console.log('Deployment name:', deployment.metadata.name);
    console.log('Container name:', container.name);
    if (container.image !== dockerImageTarget) {
      console.log('Update deployment image.');
      const kubeUpdateArgs = [
        'set', 'image', 'deployment', deployment.metadata.name, `${container.name}=${dockerImageTarget}`
      ];
      const kubeUpdateRet = spawnSync('kubectl', kubeUpdateArgs, { stdio: 'inherit' });
      if (kubeUpdateRet.status) {
        console.warn('Error code:', kubeUpdateRet.status);
      }
    } else {
      console.log('Restart pod.');
      const labelKeys = Object.keys(deployment.spec.template.metadata.labels);
      const labelValues = labelKeys.map((k) => (deployment.spec.template.metadata.labels[k]));
      const kubeRestartArgs = ['delete', 'pod', '-l', `${labelKeys[0]}=${labelValues[0]}`];
      const kubeRestartRet = spawnSync('kubectl', kubeRestartArgs, { stdio: 'inherit' });
      if (kubeRestartRet.status) {
        console.warn('Error code:', kubeRestartRet.status);
      }
    }
  });
});
console.log();
