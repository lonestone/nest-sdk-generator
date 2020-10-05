import * as chalk from 'chalk'
import * as fs from 'fs'
import { TSCoreEnvUpdater, formatAdvanced, matchString, panic } from 'typescript-core'

import { globalCmdArgs } from './cmdargs'

export const tsCoreEnv: TSCoreEnvUpdater = (prev) => ({
  verbosity: (devMode, context) =>
    matchString(globalCmdArgs.verbosity, {
      'full-silent': () => false,
      silent: () => context === 'error',
      warnings: () => context === 'error' || context === 'warn',
      default: () => (context !== 'debug' && context !== 'dump') || devMode,
      verbose: () => true,
    }),

  defaultFormattingOptions: () => ({
    ...prev.defaultFormattingOptions(),

    missingParam: (position, message) => panic("Internal error: Missing parameter {} in panic message '{}'", position + 1, message),

    stringifyOptions: (devMode, context, prettify) => ({
      ...prev.defaultFormattingOptions().stringifyOptions(devMode, context, prettify),

      highlighter: (type, content) =>
        globalCmdArgs.noColor
          ? content
          : matchString(type, {
              typename: () => chalk.yellow(content),
              prefix: () => chalk.cyan(content),
              unknown: () => chalk.yellow(content),
              unknownWrapper: () => chalk.blue(content),
              punctuation: () => chalk.cyan(content),
              listIndex: () => chalk.magenta(content),
              listValue: () => chalk.blue(content),
              collKey: () => chalk.magenta(content),
              collValue: () => chalk.blue(content),
              text: () => chalk.green(content),
              string: () => chalk.green(content),
              number: () => chalk.yellow(content),
              errorMessage: () => chalk.red(content),
              errorStack: () => chalk.red(content),
              _: () => content,
            }),
    }),
  }),

  formatExt: (color, params, paramCounter, context, options) => {
    if (params.length === 0) {
      return false
    }

    const param = params[paramCounter]

    if (!COLORS.includes(color)) {
      panic(`Internal error: unknown color ${chalk.magentaBright(color)}`)
    }

    // @ts-ignore
    return globalCmdArgs.noColor ? param.toString() : chalk[color](param.toString())
  },

  panicWatcher: (message, params) => {
    console.error(chalk.red('PANIC: ' + formatAdvanced(message, params, 'panic')))
    process.exit(1)
  },

  debug(message, params) {
    console.debug(chalk.cyan(formatAdvanced(message, params, 'debug')))
  },

  warn(message, params) {
    console.warn(chalk.yellow(formatAdvanced(message, params, 'warn')))
  },

  eprintln: (message, params) => {
    console.error(chalk.redBright(formatAdvanced(message, params, 'error')))
  },

  logger: (context, message, params) => {
    if (globalCmdArgs.logFile) {
      const formatted = `[${context}] ` + formatAdvanced(message, params, 'logging')

      if (!fs.existsSync(globalCmdArgs.logFile)) {
        fs.writeFileSync(globalCmdArgs.logFile, formatted, 'utf8')
      } else {
        fs.appendFileSync(globalCmdArgs.logFile, formatted, 'utf8')
      }
    }
  },
})

export const COLORS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'grey',
  'blackBright',
  'redBright',
  'greenBright',
  'yellowBright',
  'blueBright',
  'magentaBright',
  'cyanBright',
  'whiteBright',
]
