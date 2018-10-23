import * as fs from 'fs'
import { buildSchema, print } from 'graphql'
import { Configuration, buildRandomQuery, buildRandomMutation } from '../index'

// globals:
let schema
let schemaGitHub

// beforeAll(() => {
  const schemaDef = fs.readFileSync('./src/github.graphql').toString()
  schema = buildSchema(schemaDef)

  const schemaDefGitHub = fs.readFileSync('./src/schema.graphql').toString()
  schemaGitHub = buildSchema(schemaDefGitHub)
// })

test(`Obtain random query`, () => {
  const config : Configuration = {
    breadthProbability: 0.1,
    depthProbability: 0.1
  }

  const queryAst = buildRandomQuery(schema, config)
  expect(queryAst).toBeDefined()
  expect(print(queryAst) === '').toEqual(false)
  console.log(print(queryAst))
})