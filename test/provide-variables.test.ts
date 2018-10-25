import * as fs from 'fs'
import { buildSchema } from 'graphql'
import { generateRandomQuery } from '../src/index'
import { provideVariables } from '../src/provide-variables'
import { print } from 'graphql'

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

function getRandomRepositoryName () {
  // TODO
  return 'oasgraph'
}

const GITHUB_PROVIDERS = {
  '*__*__first': 10,
  '*__codeOfConduct__key': 'citizen_code_of_conduct', // or 'contributor_covenant'
  '*__gist__name': 'index.html',
  '*__*__number': 1,
  '*__search__query': 'test',
  '*__repository__name': getRandomRepositoryName,
  '*__marketplaceListing__slug': 'wakatime', // see 'https://github.com/marketplace',
  '*__marketplaceCategory__slug': getRandomMarketplaceSlug,
  '*__user__login': getRandomUserLogin,
  '*__repository__owner': getRandomUserLogin,
  '*__license__key': getRandomLicenseKey,
}

// globals:
const schemaDef = fs.readFileSync('./test/fixtures/schema.graphql').toString()
const schema = buildSchema(schemaDef)

const schemaDefGitHub = fs.readFileSync('./test/fixtures/github.graphql').toString()
const schemaGitHub = buildSchema(schemaDefGitHub)

test('Provide Variables for example', () => {
  const providers = {
    '*__*__*': 10
  }
  const queryAst = generateRandomQuery(schema, {breadthProbability: 1})
  const variables = provideVariables(queryAst, providers, schema)
})

test('Provide Variables for GitHub', () => {
  const queryAst = generateRandomQuery(schemaGitHub)
  const variables = provideVariables(queryAst, GITHUB_PROVIDERS, schemaGitHub)
  console.log(print(queryAst))
  console.log(JSON.stringify(variables, null, 2))
})

test('Provide variable value based on existing values', () => {
  const schemaStr = `
  type Query {
    user (name: String!): String
    company (name: String!): String
  }
  schema { query: Query }
  `
  const providers = {
    '*__user__name': (vars) => {
      if (vars.Query__company__name === 'first') {
        return 'second'
      }
      return 'first'
    },
    '*__company__name': (vars) => {
      if (vars.Query__user__name === 'first') {
        return 'second'
      }
      return 'first'
    }
  }
  const schema = buildSchema(schemaStr)
  const queryAst = generateRandomQuery(schema, {depthProbability: 1, breadthProbability: 1})
  const variables = provideVariables(queryAst, providers, schema)
  expect(variables.Query__company__name !== variables.Query__user__name).toBeTruthy()
})
