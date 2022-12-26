import _ from 'lodash';
import SimulatorXcode11 from './simulator-xcode-11';

class SimulatorXcode11_4 extends SimulatorXcode11 {
  constructor (udid, xcodeVersion) {
    super(udid, xcodeVersion);

    // for setting the location using AppleScript, the top-level menu through which
    // the 'Location' option is found
    this._locationMenu = 'Features';
  }

  /**
   * @override
   * Sets UI appearance style.
   * This function can only be called on a booted simulator.
   *
   * @since Xcode SDK 11.4
   * @param {string} value one of possible appearance values:
   * - dark: to switch to the Dark mode
   * - light: to switch to the Light mode
   */
  async setAppearance (value) {
    await this.simctl.setAppearance(_.toLower(value));
  }

  /**
   * @override
   * Gets the current UI appearance style
   * This function can only be called on a booted simulator.
   *
   * @since Xcode SDK 11.4
   * @returns {string} the current UI appearance style.
   * Possible values are:
   * - dark: to switch to the Dark mode
   * - light: to switch to the Light mode
   */
  async getAppearance () {
    return await this.simctl.getAppearance();
  }

  /**
   * @typedef {Object} CertificateOptions
   * @property {boolean} isRoot [true] - Whether to install the given
   * certificate into the Trusted Root store (`true`) or to the keychain
   * (`false`)
   */

  /**
   * @override
   * Adds the given certificate to the booted simulator.
   * The simulator could be in both running and shutdown states
   * in order for this method to run as expected.
   *
   * @param {string} payload the content of the PEM certificate
   * @param {CertificateOptions} opts
   */
  async addCertificate (payload, opts = {}) {
    const {
      isRoot = true,
    } = opts;
    const methodName = isRoot ? 'addRootCertificate' : 'addCertificate';
    await this.simctl[methodName](payload, {raw: true});
    return true;
  }

  /**
   * @override
   * Simulates push notification delivery to the booted simulator
   *
   * @since Xcode SDK 11.4
   * @param {Object} payload - The object that describes Apple push notification content.
   * It must contain a top-level "Simulator Target Bundle" key with a string value matching
   * the target application‘s bundle identifier and "aps" key with valid Apple Push Notification values.
   * For example:
   * {
   *   "Simulator Target Bundle": "com.apple.Preferences",
   *   "aps": {
   *     "alert": "This is a simulated notification!",
   *     "badge": 3,
   *     "sound": "default"
   *   }
   * }
   */
  async pushNotification (payload) {
    await this.simctl.pushNotification(payload);
  }

  /**
   * @override
   */
  async setPermissions (bundleId, permissionsMapping) {
    return await super.setPermissions(bundleId, permissionsMapping);

    // TODO: Switch to `simctl privacy` call after Apple
    // fixes the command (https://github.com/appium/appium/issues/14355)
    // Source PR: https://github.com/appium/appium-ios-simulator/pull/279
  }

  /**
   * @override
   */
  async clearKeychains () {
    await this.simctl.resetKeychain();
  }

  /**
   * @inheritdoc
   * @override
   * */
  async launchWindow (isUiClientRunning, opts) {
    // In xcode 11.4, UI Client must be first launched, otherwise
    // sim window stays minimized
    if (!isUiClientRunning) {
      await this.startUIClient(opts);
    }
    await this.boot();
  }

  /**
   * @inheritdoc
   * @override
   */
  async enableCalendarAccess (bundleID) {
    await this.simctl.grantPermission(bundleID, 'calendar');
  }

  /**
   * @inheritdoc
   * @override
   */
  async disableCalendarAccess (bundleID) {
    await this.simctl.revokePermission(bundleID, 'calendar');
  }

    /*
   * @override
   */
  async getWebInspectorSocket () {
    if (this.webInspectorSocket) {
      return this.webInspectorSocket;
    }

    // lsof -aUc launchd_sim
    // gives a set of records like:
    //   COMMAND     PID      USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
    //   launchd_s 81243 mwakizaka    3u  unix 0x9461828ef425ac31      0t0      /private/tmp/com.apple.launchd.ULf9wKNtd5/com.apple.webinspectord_sim.socket
    //   launchd_s 81243 mwakizaka    4u  unix 0x9461828ef425bc99      0t0      /tmp/com.apple.CoreSimulator.SimDevice.F1191A22-11DD-408E-8CAF-0BC4A8F79E3B/syslogsock
    //   launchd_s 81243 mwakizaka    6u  unix 0x9461828ef27d4c39      0t0      ->0x9461828ef27d4b71
    //   launchd_s 81243 mwakizaka    7u  unix 0x9461828ef425dd69      0t0      ->0x9461828ef27d5021
    //   launchd_s 81243 mwakizaka    8u  unix 0x9461828ef425b4c9      0t0      /private/tmp/com.apple.launchd.88z8qTMoJA/Listeners
    //   launchd_s 81243 mwakizaka    9u  unix 0x9461828ef425be29      0t0      /private/tmp/com.apple.launchd.rbqFyGyXrT/com.apple.testmanagerd.unix-domain.socket
    //   launchd_s 81243 mwakizaka   10u  unix 0x9461828ef425b4c9      0t0      /private/tmp/com.apple.launchd.88z8qTMoJA/Listeners
    //   launchd_s 81243 mwakizaka   11u  unix 0x9461828ef425c081      0t0      /private/tmp/com.apple.launchd.zHidszZQUZ/com.apple.testmanagerd.remote-automation.unix-domain.socket
    //   launchd_s 81243 mwakizaka   12u  unix 0x9461828ef425def9      0t0      ->0x9461828ef425de31
    //   launchd_s 35621 mwakizaka    4u  unix 0x7b7dbedd6d63253f      0t0      /tmp/com.apple.CoreSimulator.SimDevice.150983FD-82FB-4A7B-86DC-D3D264DD90E5/syslogsock
    //   launchd_s 35621 mwakizaka    5u  unix 0x7b7dbedd6d62f727      0t0      /private/tmp/com.apple.launchd.zuM1XDJcwr/com.apple.webinspectord_sim.socket
    //   launchd_s 35621 mwakizaka    9u  unix 0x7b7dbedd6d632607      0t0      /private/tmp/com.apple.launchd.KbYwOrA36E/Listeners
    //   launchd_s 35621 mwakizaka   10u  unix 0x7b7dbedd6d62f727      0t0      /private/tmp/com.apple.launchd.zuM1XDJcwr/com.apple.webinspectord_sim.socket
    //   launchd_s 35621 mwakizaka   11u  unix 0x7b7dbedd6d62e6bf      0t0      /private/tmp/com.apple.launchd.7wTVfXC9QX/com.apple.testmanagerd.unix-domain.socket
    //   launchd_s 35621 mwakizaka   12u  unix 0x7b7dbedd6d632607      0t0      /private/tmp/com.apple.launchd.KbYwOrA36E/Listeners
    //   launchd_s 35621 mwakizaka   13u  unix 0x7b7dbedd6d62e84f      0t0      /private/tmp/com.apple.launchd.g7KQlSsvXT/com.apple.testmanagerd.remote-automation.unix-domain.socket
    //   launchd_s 35621 mwakizaka   15u  unix 0x7b7dbedd6d62e6bf      0t0      /private/tmp/com.apple.launchd.7wTVfXC9QX/com.apple.testmanagerd.unix-domain.socket
    //   launchd_s 35621 mwakizaka   16u  unix 0x7b7dbedd6d62e84f      0t0      /private/tmp/com.apple.launchd.g7KQlSsvXT/com.apple.testmanagerd.remote-automation.unix-domain.socket
    // these _appear_ to always be grouped together by PID for each simulator.
    // Therefore, by obtaining simulator PID with an expected simulator UDID,
    // we get the correct `com.apple.webinspectord_sim.socket` to get the correct socket
    // In this way, we don't depend on the order of `lsof -aUc launchd_sim` result.
    const {stdout} = await exec('lsof', ['-aUc', 'launchd_sim']);
    const udidMatch = stdout.match(new RegExp('([0-9]{1,5}).+' + this.udid));
    if (!udidMatch) {
      return null;
    }
    const pidMatch = stdout.match(new RegExp(udidMatch[1] + ".+\\s+(\\S+com\.apple\.webinspectord_sim\.socket)"));
    if (!pidMatch) {
      return null;
    }
    this.webInspectorSocket = pidMatch[1];
    return this.webInspectorSocket;
  }

}

export default SimulatorXcode11_4;
