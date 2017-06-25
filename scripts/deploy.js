const spawn = require('child_process').spawn;
const meta = require('../package');

// 作業ディレクトリをパッケージのあるディレクトリにする。
process.chdir(__dirname);
process.chdir('..');

Promise.resolve()
  // Docker Machineがインストールされているか確認する。
  .then(() => (new Promise((resolve, reject) => {
    console.log('Check Docker Machine.')
    const machine = spawn('docker-machine', ['version']);
    let found = true;
    machine.on('error', (err) => {
      if (err.code === 'ENOENT') {
        found = false;
        return;
      }
      throw err;
    });
    machine.on('exit', () => {
      console.log(`Docker Machine: ${found ? '' : 'not '}found`);
      return resolve(found);
    });
  })))
  // Docker Machineが検出された場合、Docker Machineを起動する。
  .then((found) => (new Promise((resolve, reject) => {
    if (!found) {
      return resolve(found);
    }
    console.log('\nStart Docker Machine.');
    const machine = spawn('docker-machine', ['start'], {
      stdio: [null, process.stdout, process.stderr],
    });
    machine.on('error', reject);
    machine.on('exit', () => {
      return resolve(found);
    });
  })))
  // Dockerコマンドへ渡すための、Docker Machineの設定を取得する。
  .then((found) => (new Promise((resolve, reject) => {
    if (!found) {
      return resolve([]);
    }
    console.log('\nGet configuration of Docker Machine.');
    const machine = spawn('docker-machine', ['config'], {
      stdio: [null, null, process.stderr],
    });
    let out = '';
    machine.stdout.on('data', (data) => { out += data; });
    machine.on('error', reject);
    machine.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error('Docker Machine failed.'));
      }
      const config = out.split('\n').filter((item) => (item !== ''));
      console.log(`Config: ${config}`);
      return resolve(config);
    });
  })))
  // Kubernetesの現在のコンテキストを取得する。
  .then((config) => (new Promise((resolve, reject) => {
    console.log('\nGet current context of Kubernetes.');
    const machine = spawn('kubectl', ['config', 'current-context'], {
      stdio: [null, null, process.stderr],
    });
    let out = '';
    machine.stdout.on('data', (data) => { out += data; });
    machine.on('error', reject);
    machine.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error('Kubernetes failed.'));
      }
      const split = out.replace('\n', '').split('_').filter((item) => (item !== ''));
      if (split.length <= 3) {
        return reject(new Error('Parsing failed.'))
      }
      const context = { project: split[1], zone: split[2], cluster: split[3] };
      console.log(`Project: ${context.project}`);
      console.log(`Zone: ${context.zone}`);
      console.log(`Cluster: ${context.cluster}`);
      return resolve([config, context]);
    });
  })))
  // Dockerイメージにタグを設定する。
  .then(([config, context]) => (new Promise((resolve, reject) => {
    console.log('\nCreate a tag to Docker image.');
    const source = `${meta.name}:${meta.version}`;
    const prefix = ['us.', 'eu.', 'asia.', ''].find((zone) => (context.zone.startsWith(zone.replace('.', ''))));
    const target = `${prefix}gcr.io/${context.project}/${source}`;
    console.log(`Source: ${source}`);
    console.log(`Target: ${target}`);
    const machine = spawn('docker', [...config, 'tag', source , target], {
      stdio: [null, process.stdout, process.stderr],
    });
    machine.on('error', reject);
    machine.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error('Docker failed.'));
      }
      return resolve([config, target]);
    });
  })))
  // Dockerイメージをレポジトリに送信する。
  .then(([config, target]) => (new Promise((resolve, reject) => {
    console.log('\nPush a tagged image to a repository.');
    const machine = spawn('gcloud', ['docker', '--', ...config, 'push', target], {
      shell: true,
      stdio: [null, process.stdout, process.stderr],
    });
    machine.on('error', reject);
    machine.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error('Docker failed.'));
      }
      return resolve([config, target]);
    });
  })))
  .then(() => {
    console.log('\nDeploy succeeded.\n')
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nDeploy failed. Error: ${err}\n`);
    process.exit(1);
  });
