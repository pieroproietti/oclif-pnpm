import {Command, Flags} from '@oclif/core'
import * as fs from 'fs'
import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, templateShortKey} from '../../upload-util'

export default class UploadWin extends Command {
  static description = 'upload windows installers built with pack:win'

  static flags = {
    root: Flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(UploadWin)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, config, dist} = buildConfig
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    const archs = buildConfig.targets.filter(t => t.platform === 'win32').map(t => t.arch)

    for (const arch of archs) {
      const templateKey = templateShortKey('win32', {bin: config.bin, version: config.version, sha: buildConfig.gitSha, arch})
      const localKey = dist(`win32/${templateKey}`)
      if (!fs.existsSync(localKey)) this.error(`Cannot find Windows exe for ${arch}`, {
        suggestions: ['Run "oclif pack win" before uploading'],
      })
    }

    const cloudKeyBase = commitAWSDir(config.pjson.version, buildConfig.gitSha, s3Config)
    const uploadWin = async (arch: 'x64' | 'x86') => {
      const templateKey = templateShortKey('win32', {bin: config.bin, version: config.version, sha: buildConfig.gitSha, arch})
      const localExe = dist(`win32/${templateKey}`)
      const cloudKey = `${cloudKeyBase}/${templateKey}`
      if (fs.existsSync(localExe)) await aws.s3.uploadFile(localExe, {...S3Options, CacheControl: 'max-age=86400', Key: cloudKey})
    }

    await Promise.all([uploadWin('x64'), uploadWin('x86')])

    log(`done uploading windows executables for v${config.version}-${buildConfig.gitSha}`)
  }
}
