// transpile:mocha

import { getSimulator } from '../..';
import * as simctl from 'node-simctl';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { fs } from 'appium-support';
import B from 'bluebird';
import getAppPath from 'sample-apps';

const LONG_TIMEOUT = 120*1000;
const MED_TIMEOUT = 30*1000;

chai.should();
chai.use(chaiAsPromised);

function runTests (deviceType) {
  describe(`simulator ${deviceType.version}`, () => {
    let udid;
    beforeEach(async () => {
      udid = await simctl.createDevice('ios-simulator testing',
                                       deviceType.device,
                                       deviceType.version);
    });
    afterEach(async function () {
      this.timeout(LONG_TIMEOUT);
      // only want to get rid of the device if it is present
      let devicePresent = (await simctl.getDevices())[deviceType.version]
        .filter((device) => {
          return device.udid === udid;
        }).length > 0;
      if (devicePresent) {
        await simctl.deleteDevice(udid);
      }
    });


    it('should detect whether a simulator has been run before', async function () {
      this.timeout(LONG_TIMEOUT);

      let sim = await getSimulator(udid);
      await sim.isFresh().should.eventually.equal(true);
      await sim.launchAndQuit();
      await sim.isFresh().should.eventually.equal(false);
    });

    it('should launch and shutdown a sim', async function () {
      this.timeout(LONG_TIMEOUT);

      let sim = await getSimulator(udid);
      await sim.launchAndQuit();
      (await sim.stat()).state.should.equal('Shutdown');
    });

    it('should clean a sim', async function () {
      this.timeout(MED_TIMEOUT);

      let sim = await getSimulator(udid);
      await sim.isFresh().should.eventually.equal(true);
      await sim.launchAndQuit();
      await sim.isFresh().should.eventually.equal(false);
      await sim.clean();
      await sim.isFresh().should.eventually.equal(true);
    });

    it('should not find any TestApp data or bundle directories on a fresh simulator', async function(){
      this.timeout(MED_TIMEOUT);
      let sim = await getSimulator(udid);
      let dirs = await sim.getAppDirs('TestApp', 'io.appium.TestApp');
      dirs.should.have.length(0);
    });

    it('should find both a data and bundle directory for TestApp', async function(){
      this.timeout(MED_TIMEOUT);
      let sim = await getSimulator(udid);
      await sim.run();

      // install & launch test app
      await simctl.installApp(udid, getAppPath('TestApp'));
      await simctl.launch(udid, 'io.appium.TestApp');

      let dirs = await sim.getAppDirs('TestApp', 'io.appium.TestApp');
      dirs.should.have.length(2);
      dirs[0].should.contain('/Data/');
      dirs[1].should.contain('/Bundle/');
    });

    it('should delete custom app data', async function(){
      this.timeout(MED_TIMEOUT);
      let sim = await getSimulator(udid);
      await sim.run();

      // install & launch test app
      await simctl.installApp(udid, getAppPath('TestApp'));
      await simctl.launch(udid, 'io.appium.TestApp');

      // delete app directories
      await sim.cleanCustomApp('TestApp', 'io.appium.TestApp');

      // clear paths to force the simulator to get a new list of directories
      sim.appDataBundlePaths = {};

      let dirs = await sim.getAppDirs('TestApp', 'io.appium.TestApp');
      dirs.should.have.length(0);
    });

    it('should delete a sim', async function () {
      let numDevices = (await simctl.getDevices())[deviceType.version].length;
      numDevices.should.be.above(0);

      let sim = await getSimulator(udid);
      await sim.delete();
      let numDevicesAfter = (await simctl.getDevices())[deviceType.version].length;
      numDevicesAfter.should.equal(numDevices-1);
    });

    let itText = 'should match a bundleId to its app directory on a used sim';
    let bundleId = 'com.apple.mobilesafari';
    if (deviceType.version === '7.1') {
      itText = 'should match an app to its app directory on a used sim';
      bundleId = 'MobileSafari';
    }
    it(itText, async function () {
      this.timeout(MED_TIMEOUT);

      let sim = await getSimulator(udid);
      await sim.launchAndQuit();

      let path = await sim.getAppDataDir(bundleId);
      await fs.hasAccess(path).should.eventually.be.true;
    });

    itText = 'should match a bundleId to its app directory on a fresh sim';
    bundleId = 'com.apple.mobilesafari';
    if (deviceType.version === '7.1') {
      itText = 'should match an app to its app directory on a fresh sim';
      bundleId = 'MobileSafari';
    }
    it(itText, async function () {
      this.timeout(LONG_TIMEOUT);

      let sim = await getSimulator(udid);
      let path = await sim.getAppDataDir(bundleId);
      await fs.hasAccess(path).should.eventually.be.true;
    });

    it('should start a sim using the "run" method', async function () {
      this.timeout(LONG_TIMEOUT);

      let sim = await getSimulator(udid);

      await sim.run();

      let stat = await sim.stat();
      stat.state.should.equal('Booted');

      await sim.shutdown();
      stat = await sim.stat();
      stat.state.should.equal('Shutdown');
    });
  });

  describe(`reuse an already-created already-run simulator ${deviceType.version}`, () => {
    let sim;
    before(async function () {
      this.timeout(LONG_TIMEOUT);
      let udid = await simctl.createDevice('ios-simulator testing',
                                       deviceType.device,
                                       deviceType.version);
      sim = await getSimulator(udid);
      await sim.run();
      await sim.shutdown();
      await B.delay(3000);
    });
    after(async function () {
      this.timeout(LONG_TIMEOUT);
      // only want to get rid of the device if it is present
      let devicePresent = (await simctl.getDevices())[deviceType.version]
        .filter((device) => {
          return device.udid === sim.udid;
        }).length > 0;
      if (devicePresent) {
        await simctl.deleteDevice(sim.udid);
      }
    });

    it('should start a sim using the "run" method', async function () {
      this.timeout(LONG_TIMEOUT);

      await sim.run();

      let stat = await sim.stat();
      stat.state.should.equal('Booted');

      await sim.shutdown();
      stat = await sim.stat();
      stat.state.should.equal('Shutdown');
    });
  });
}

const deviceTypes = [
  {
    version: '8.4',
    device: 'iPhone 6'
  },
  {
    version: '9.0',
    device: 'iPhone 6s'
  },
  {
    version: '9.1',
    device: 'iPhone 6s'
  }
];
for (let deviceType of deviceTypes) {
  runTests(deviceType);
}
