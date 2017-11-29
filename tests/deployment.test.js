import { resolve } from "path";
import { expect } from 'chai';
import getFiles from '../src/util/get-files';
import detectDeploymentType from '../src/util/detect-deployment-type';
import ensureAppHasDockerfile from '../src/util/ensure-has-dockerfile';

const project = name => resolve(__dirname, 'fixtures/projects', name);

describe('Deployment', () => {
  it('should get files from a simple static project', async () => {
    const { files } = await getFiles(project('static-hello-world'));

    expect(files).to.have.lengthOf(1);
    expect(files[0]).to.have.property('path', 'index.html');
    expect(files[0]).to.have.property('size', 259);

    const checksum = '899f25fe18ca2aae83be2b407c785f7bf2ab3cf6c087afb734da2277beb6c515';
    expect(files[0]).to.have.property('checksum', checksum);

    const mode = files[0].mode & parseInt("0777", 8);
    expect(mode).to.be.equal(parseInt("0664", 8) & parseInt("0777", 8));
  });

  it('should detect static projects', () => {
    let deploymentType, files;

    files = [{ path: 'index.html' }];
    deploymentType = detectDeploymentType({ static: true }, files);
    expect(deploymentType).to.be.equal('static');

    deploymentType = detectDeploymentType({}, files);
    expect(deploymentType).to.be.equal('static');

    files = [{ path: 'index.html' }, { path: 'package.json' }];
    deploymentType = detectDeploymentType({}, files);
    expect(deploymentType).to.be.not.equal('static');

    files = [{ path: 'index.html' }, { path: 'Dockerfile' }];
    deploymentType = detectDeploymentType({}, files);
    expect(deploymentType).to.be.not.equal('static');

    files = [{ path: 'index.html' }, { path: 'assets/style.css' }];
    deploymentType = detectDeploymentType({}, files);
    expect(deploymentType).to.be.equal('static');
  });

  it('should throw an error when detects multiple deployment types', () => {
    let deploymentType, files;

    deploymentType = () => detectDeploymentType({ static: true, docker: true }, []);
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    deploymentType = () => detectDeploymentType({ docker: true, node: true }, []);
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    deploymentType = () => detectDeploymentType({ node: true, static: true }, []);
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    deploymentType = () => detectDeploymentType({ node: true, docker: true, static: true }, []);
    expect(deploymentType).to.throw(`You can not specify multiple deployment types.`);

    files = [{ path: 'package.json' }, { path: 'Dockerfile' }, { path: 'index.html' }];
    deploymentType = () => detectDeploymentType({}, files);
    expect(deploymentType).to.throw(`The project contains both of the \`package.json\` and \`Dockerfile\` files.
Please specify your deployment type with --node, --docker or --static options.`);
  });

  it('should throw an error when the project doesn\'t have the required files', () => {
    let deploymentType, files;

    deploymentType = () => detectDeploymentType({ node: true }, []);
    expect(deploymentType).to.throw(/file doesn't exists./);

    deploymentType = () => detectDeploymentType({ docker: true }, []);
    expect(deploymentType).to.throw(/file doesn't exists./);

    deploymentType = () => detectDeploymentType({ static: true }, []);
    expect(deploymentType).to.throw(/Project is empty!/);
  });

  it('should ensure app has a Dockerfile', () => {
    let files, map;

    const filterDockerfiles = files => files.filter(file => file.path === 'Dockerfile');

    files = [{ path: 'Dockerfile' }, { path: 'woof/Dockerfile' }, { path: 'index.php' }];
    map = new Map;
    var { filesWithDockerfile } = ensureAppHasDockerfile('docker', files, map);
    expect(filterDockerfiles(filesWithDockerfile)).to.have.lengthOf(1);

    // This app doesn't have a dockerfile in the root
    files = [{ path: 'woof/Dockerfile' }, { path: 'index.html' }];
    map = new Map;
    var { filesWithDockerfile } = ensureAppHasDockerfile('static', files, map);
    expect(filterDockerfiles(filesWithDockerfile)).to.have.lengthOf(1);
  });
});