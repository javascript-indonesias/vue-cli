const chalk = require('chalk')
const semver = require('semver')
const invoke = require('./invoke')
const inquirer = require('inquirer')
const { resolveModule, loadModule } = require('@vue/cli-shared-utils')

const PackageManager = require('./util/ProjectPackageManager')
const {
  log,
  error,
  resolvePluginId,
  isOfficialPlugin
} = require('@vue/cli-shared-utils')
const confirmIfGitDirty = require('./util/confirmIfGitDirty')

async function add (pluginName, options = {}, context = process.cwd()) {
  if (!(await confirmIfGitDirty(context))) {
    return
  }

  // for `vue add` command in 3.x projects
  const servicePkg = loadModule('@vue/cli-service/package.json', context)
  if (servicePkg && semver.satisfies(servicePkg.version, '3.x')) {
    // special internal "plugins"
    if (/^(@vue\/)?router$/.test(pluginName)) {
      return addRouter(context)
    }
    if (/^(@vue\/)?vuex$/.test(pluginName)) {
      return addVuex(context)
    }
  }

  const packageName = resolvePluginId(pluginName)

  log()
  log(`📦  Installing ${chalk.cyan(packageName)}...`)
  log()

  const pm = new PackageManager({ context })

  const cliVersion = require('../package.json').version
  if (isOfficialPlugin(packageName) && semver.prerelease(cliVersion)) {
    await pm.add(`${packageName}@^${cliVersion}`)
  } else {
    await pm.add(packageName)
  }

  log(`${chalk.green('✔')}  Successfully installed plugin: ${chalk.cyan(packageName)}`)
  log()

  const generatorPath = resolveModule(`${packageName}/generator`, context)
  if (generatorPath) {
    invoke(pluginName, options, context)
  } else {
    log(`Plugin ${packageName} does not have a generator to invoke`)
  }
}

module.exports = (...args) => {
  return add(...args).catch(err => {
    error(err)
    if (!process.env.VUE_CLI_TEST) {
      process.exit(1)
    }
  })
}

async function addRouter (context) {
  const options = await inquirer.prompt([{
    name: 'routerHistoryMode',
    type: 'confirm',
    message: `Use history mode for router? ${chalk.yellow(`(Requires proper server setup for index fallback in production)`)}`
  }])
  invoke.runGenerator(context, {
    id: 'core:router',
    apply: loadModule('@vue/cli-service/generator/router', context),
    options
  })
}

async function addVuex (context) {
  invoke.runGenerator(context, {
    id: 'core:vuex',
    apply: loadModule('@vue/cli-service/generator/vuex', context)
  })
}
