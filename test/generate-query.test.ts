import * as fs from 'fs'
import { buildSchema, print, validate } from 'graphql'
import { Configuration, generateRandomQuery } from '../src/index'

// globals:
const schemaDef = fs.readFileSync('./test/fixtures/schema.graphql').toString()
const schema = buildSchema(schemaDef)

const schemaDefGitHub = fs.readFileSync('./test/fixtures/github.graphql').toString()
const schemaGitHub = buildSchema(schemaDefGitHub)

test(`Obtain random query from example schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.1,
    depthProbability: 0.1
  }

  const queryAst = generateRandomQuery(schema, config)
  expect(queryAst).toBeDefined()
  expect(print(queryAst) === '').toEqual(false)
  const errors = validate(schema, queryAst)
  expect(errors).toEqual([])
})

test(`Obtain random query from GitHub schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.2,
    depthProbability: 0.6,
    maxDepth: 7,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first']
  }

  const queryAst = generateRandomQuery(schemaGitHub, config)
  console.log(print(queryAst))
  // console.log(JSON.stringify(queryAst, null, 2))

  expect(queryAst).toBeDefined()
  expect(print(queryAst) === '').toEqual(false)
  const errors = validate(schemaGitHub, queryAst)
  expect(errors).toEqual([])
})