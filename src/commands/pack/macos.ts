import * as path from 'path'

import * as _ from 'lodash'
import * as fs from 'fs-extra'
import {Command, Flags} from '@oclif/core'
import {Interfaces} from '@oclif/core'

import * as Tarballs from '../../tarballs'
import {templateShortKey} from '../../upload-util'
import {exec as execSync} from 'child_process'
import {promisify} from 'node:util'

const exec = promisify(execSync)
type OclifConfig = {
  macos?: {
    identifier?: string;
    sign?: string;
  };
}

const noBundleConfiguration = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array/>
</plist>
`

const scripts = {
  preinstall: (config: Interfaces.Config, additionalCLI: string | undefined) => `#!/usr/bin/env bash
sudo rm -rf /usr/local/lib/${config.dirname}
sudo rm -rf /usr/local/${config.bin}
sudo rm -rf /usr/local/bin/${config.bin}
${additionalCLI ?
    `sudo rm -rf /usr/local/${additionalCLI}
sudo rm -rf /usr/local/bin/${additionalCLI}` : ''}
`,
  postinstall: (config: Interfaces.Config, additionalCLI: string | undefined) => `#!/usr/bin/env bash
set -x
sudo mkdir -p /usr/local/bin
sudo ln -sf /usr/local/lib/${config.dirname}/bin/${config.bin} /usr/local/bin/${config.bin}
${additionalCLI ? `sudo ln -sf /usr/local/lib/${config.dirname}/bin/${additionalCLI} /usr/local/bin/${additionalCLI}` : ''}
`,
  uninstall: (config: Interfaces.Config, additionalCLI: string | undefined) => {
    const packageIdentifier = (config.pjson.oclif as OclifConfig).macos!.identifier!
    return `#!/usr/bin/env bash

#Parameters
DATE=\`date +%Y-%m-%d\`
TIME=\`date +%H:%M:%S\`
LOG_PREFIX="[$DATE $TIME]"

#Functions
log_info() {
    echo "\${LOG_PREFIX}[INFO]" $1
}

log_warn() {
    echo "\${LOG_PREFIX}[WARN]" $1
}

log_error() {
    echo "\${LOG_PREFIX}[ERROR]" $1
}

#Check running user
if (( $EUID != 0 )); then
    echo "Please run as root."
    exit
fi

echo "Welcome to Application Uninstaller"
echo "The following packages will be REMOVED:"
echo "  ${config.dirname}"
while [ "$1" != "-y" ]; do
    read -p "Do you wish to continue [Y/n]?" answer
    [[ $answer == "y" || $answer == "Y" || $answer == "" ]] && break
    [[ $answer == "n" || $answer == "N" ]] && exit 0
    echo "Please answer with 'y' or 'n'"
done

echo "Application uninstalling process started"
# remove link to shortcut file
find "/usr/local/bin/" -name "${config.bin}" | xargs rm
${additionalCLI ? `find "/usr/local/bin/" -name "${additionalCLI}" | xargs rm` : ''}
if [ $? -eq 0 ]
then
  echo "[1/3] [DONE] Successfully deleted shortcut links"
else
  echo "[1/3] [ERROR] Could not delete shortcut links" >&2
fi

#forget from pkgutil
pkgutil --forget "${packageIdentifier}" > /dev/null 2>&1
if [ $? -eq 0 ]
then
  echo "[2/3] [DONE] Successfully deleted application informations"
else
  echo "[2/3] [ERROR] Could not delete application informations" >&2
fi

#remove application source distribution
[ -e "/usr/local/lib/${config.dirname}" ] && rm -rf "/usr/local/lib/${config.dirname}"

#remove application data directory
[ -e "${config.dataDir}" ] && rm -rf "${config.dataDir}"

#remove application cache directory
[ -e "${config.cacheDir}" ] && rm -rf "${config.cacheDir}"

#remove application config directory
[ -e "${config.configDir}" ] && rm -rf "${config.configDir}"

if [ $? -eq 0 ]
then
  echo "[3/3] [DONE] Successfully deleted application"
else
  echo "[3/3] [ERROR] Could not delete application" >&2
fi

echo "Application uninstall process finished"
exit 0
`
  },
}

export default class PackMacos extends Command {
  static description = 'pack CLI into macOS .pkg'

  static flags = {
    root: Flags.string({
      char: 'r',
      description: 'path to oclif CLI root',
      default: '.',
      required: true,
    }),
    'additional-cli': Flags.string({
      description: `an Oclif CLI other than the one listed in config.bin that should be made available to the user
the CLI should already exist in a directory named after the CLI that is the root of the tarball produced by "oclif pack:tarballs"`,
      hidden: true,
    }),
    tarball: Flags.string({
      char: 't',
      description: 'optionally specify a path to a tarball already generated by NPM',
      required: false,
    }),
    targets: Flags.string({
      description: 'comma-separated targets to pack (e.g.: darwin-x64,darwin-arm64)',
    }),
  }

  async run(): Promise<void> {
    if (process.platform !== 'darwin') this.error('must be run from macos')
    const {flags} = await this.parse(PackMacos)
    const buildConfig = await Tarballs.buildConfig(flags.root, {targets: flags?.targets?.split(',')})
    const {config} = buildConfig
    const c = config.pjson.oclif as OclifConfig
    if (!c.macos) this.error('package.json is missing an oclif.macos config')
    if (!c.macos.identifier) this.error('package.json must have oclif.macos.identifier set')
    const macos = c.macos
    const packageIdentifier = macos.identifier
    await Tarballs.build(buildConfig, {platform: 'darwin', pack: false, tarball: flags.tarball, parallel: true})
    const scriptsDir = path.join(buildConfig.tmp, 'macos/scripts')
    await fs.emptyDir(buildConfig.dist('macos'))
    const noBundleConfigurationPath = path.join(buildConfig.tmp, 'macos', 'no-bundle.plist')

    const build = async (arch: Interfaces.ArchTypes) => {
      const templateKey = templateShortKey('macos', {bin: config.bin, version: config.version, sha: buildConfig.gitSha, arch})
      const dist = buildConfig.dist(`macos/${templateKey}`)
      const rootDir = buildConfig.workspace({platform: 'darwin', arch})
      const writeNoBundleConfiguration = async () => {
        await fs.mkdir(path.dirname(noBundleConfigurationPath), {recursive: true})
        await fs.writeFile(noBundleConfigurationPath, noBundleConfiguration, {mode: 0o755})
      }

      const writeScript = async (script: 'preinstall' | 'postinstall' | 'uninstall') => {
        const scriptLocation = script === 'uninstall' ? [rootDir, 'bin'] : [scriptsDir]
        scriptLocation.push(script)
        await fs.mkdir(path.dirname(path.join(...scriptLocation)), {recursive: true})
        await fs.writeFile(path.join(...scriptLocation), scripts[script](config, flags['additional-cli']), {mode: 0o755})
      }

      await Promise.all([
        writeNoBundleConfiguration(),
        writeScript('preinstall'),
        writeScript('postinstall'),
        writeScript('uninstall'),
      ])
      /* eslint-disable array-element-newline */
      const args = [
        '--root', rootDir,
        '--component-plist', noBundleConfigurationPath,
        '--identifier', packageIdentifier,
        '--version', config.version,
        '--install-location', `/usr/local/lib/${config.dirname}`,
        '--scripts', scriptsDir,
      ]
      /* eslint-enable array-element-newline */
      if (macos.sign) {
        args.push('--sign', macos.sign)
      } else this.debug('Skipping macOS pkg signing')
      if (process.env.OSX_KEYCHAIN) args.push('--keychain', process.env.OSX_KEYCHAIN)
      args.push(dist)
      await exec(`pkgbuild  ${args.join(' ')}`)
    }

    const arches = _.uniq(buildConfig.targets
    .filter(t => t.platform === 'darwin')
    .map(t => t.arch))
    await Promise.all(arches.map(a => build(a)))
  }
}