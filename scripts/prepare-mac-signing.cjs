const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = ({ electronPlatformName, appOutDir, packager }) => {
  if (electronPlatformName !== 'darwin' && electronPlatformName !== 'mas') return;
  const bundle = path.join(appOutDir, packager.appInfo.productFilename + '.app');
  // Finder metadata copied into a build directory can prevent codesign from sealing the bundle.
  execFileSync('/usr/bin/xattr', ['-cr', bundle]);
};
