import * as fs from 'fs'
import { buildSchema } from 'graphql'
import { generateRandomQuery } from '../src/index'
import { provideVariables } from '../src/provide-variables'

function getRandomMarketplaceSlug () {
  const slugs = [
    'chat',
    'code-quality',
    'code-review',
    'continuous-integration',
    'dependency-management',
    'deployment',
    'learning',
    'localization',
    'mobile',
    'project-management',
    'publishing',
    'recently-added',
    'security',
    'support',
    'testing',
    'utilities'
  ]
  return slugs[Math.floor(Math.random() * slugs.length)]
}

function getRandomUserLogin () {
  // TODO: return random user
  return 'erikwittern'
}

function getRandomLicenseKey () {
  // TODO: return random license key
  return 'MIT'
}

const GITHUB_PROVIDERS = {
  '*__*__first': 10,
  '*__codeOfConduct__key': 'citizen_code_of_conduct', // or 'contributor_covenant'
  '*__gist__name': 'index.html',
  '*__*__number': 1,
  '*__search__query': 'test',
  '*__marketplaceCategory__slug': getRandomMarketplaceSlug,
  '*__user__login': getRandomUserLogin,
  '*__license_key': getRandomLicenseKey,
}

// globals:
const schemaDefGitHub = fs.readFileSync('./test/fixtures/github.graphql').toString()
const schemaGitHub = buildSchema(schemaDefGitHub)

test('Provide Variables', () => {
  const queryAst = generateRandomQuery(schemaGitHub)
  const variables = provideVariables(queryAst, GITHUB_PROVIDERS)
  console.log(variables)
})