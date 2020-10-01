import { rawCmdArgs } from '../cmdargs'

export interface CmdArgs {
  readonly input: string
  readonly output: string
  readonly allowAllImportExt: boolean
  readonly prettify: boolean
  readonly prettierConfig?: string
}

export const cmdArgs: CmdArgs = {
  input: rawCmdArgs._[1] ?? rawCmdArgs['input'] ?? rawCmdArgs['i'],
  output: rawCmdArgs._[2] ?? rawCmdArgs['output'] ?? rawCmdArgs['o'],
  allowAllImportExt: !!rawCmdArgs['allow-all-import-ext'],
  prettify: !!rawCmdArgs['prettify'],
  prettierConfig: rawCmdArgs['prettier-config'],
}
