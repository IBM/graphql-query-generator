import { matchVarName } from '../src/index'

test(`Match query against concrete values`, () => {
  const existingVars = {
    'Query__repository__name': 10,
    'Some__other__thing': 5
  }
  const key = matchVarName('*__repository__name', Object.keys(existingVars))
  expect(key).toBeDefined()
  expect(existingVars[key]).toEqual(10)
})

test(`Match concrete value against queries`, () => {
  const existingVars = {
    '*__other__thing': 5,
    '*__*__blah': 10
  }
  const key = matchVarName('*This__is__blah', Object.keys(existingVars))
  expect(key).toBeDefined()
  expect(existingVars[key]).toEqual(10)
})
