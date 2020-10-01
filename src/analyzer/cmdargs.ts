import { rawCmdArgs } from '../cmdargs'

export interface CmdArgs {
  readonly input: string
  readonly output?: string
  readonly pretty?: boolean
  readonly allowAllImportExt: boolean
}

export const cmdArgs: CmdArgs = {
  input: rawCmdArgs._[1] ?? rawCmdArgs['input'] ?? rawCmdArgs['i'],
  output: rawCmdArgs._[2] ?? rawCmdArgs['output'] ?? rawCmdArgs['o'],
  pretty: !!rawCmdArgs['pretty'],
  allowAllImportExt: !!rawCmdArgs['allow-all-import-ext'],
}
