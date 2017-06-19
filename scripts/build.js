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
    machine.on('error', reject);
    machine.on('exit', () => {
      console.log('Docker Machine found.');
      return resolve();
    });
  })))
  // Docker Machineがインストールされている場合、Docker Machineを起動する。
  .then(() => (new Promise((resolve, reject) => {
    console.log('\nStart Docker Machine.');
    const machine = spawn('docker-machine', ['start'], {
      stdio: [null, process.stdout, process.stderr],
    });
    machine.on('error', reject);
    machine.on('exit', () => {
      return resolve();
    });
  })))
  // Dockerコマンドへ渡すための、Docker Machineの設定を取得する。
  .then(() => (new Promise((resolve, reject) => {
    console.log('\nGet configuration of Docker Machine.');
    const machine = spawn('docker-machine', ['config'], {
      stdio: [null, null, process.stderr],
    });
    let out = '';
    machine.stdout.on('data', (data) => { out += data; });
    machine.on('error', reject);
    machine.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error('Doccker Machine failed.'));
      }
      const config = out.split('\n').filter((item) => (item !== ''));
      return resolve(config);
    });
  })))
  // Docker Machineが見つからない場合のエラーを無視する。
  .catch((err) => {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  })
  // 取得した設定を用いて、Dockerイメージをビルドする。
  .then((config) => (new Promise((resolve, reject) => {
    console.log('\nBuild Docker Image.');
    const machine = spawn('docker', [...config, 'build', '-t', `${meta.name}:${meta.version}`, '.'], {
      stdio: [null, process.stdout, process.stderr],
    });
    machine.on('error', reject);
    machine.on('exit', (code) => {
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
