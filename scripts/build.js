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
      console.log(`Docker Machine: ${found.toString()}`);
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
  // 取得した設定を用いて、Dockerイメージをビルドする。
  .then((config) => (new Promise((resolve, reject) => {
    console.log('\nBuild Docker image.');
    const docker = spawn('docker', [...config, 'build', '-t', `${meta.name}:${meta.version}`, '.'], {
      stdio: [null, process.stdout, process.stderr],
    });
    docker.on('error', reject);
    docker.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error('Docker failed.'));
      }
      return resolve(config);
    });
  })))
  .then(() => {
    console.log('\nBuild succeeded.\n')
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\nBuild failed. Error: ${err}\n`);
    process.exit(1);
  });
