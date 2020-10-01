import * as minimist from 'minimist'

export const rawCmdArgs = minimist(process.argv.slice(2))

export interface GlobalCmdArgs {
  readonly verbosity: 'verbose' | 'default' | 'warnings' | 'silent' | 'full-silent'
  readonly noColor: boolean
  readonly logFile?: string
}

export const globalCmdArgs: GlobalCmdArgs = {
  verbosity: rawCmdArgs['full-silent']
    ? 'full-silent'
    : rawCmdArgs['silent']
    ? 'silent'
    : rawCmdArgs['warnings']
    ? 'warnings'
    : rawCmdArgs['verbose']
    ? 'verbose'
    : 'default',
  noColor: !!rawCmdArgs['no-color'],
  logFile: rawCmdArgs['log-file'],
}
