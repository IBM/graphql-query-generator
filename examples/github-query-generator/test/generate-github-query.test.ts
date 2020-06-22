import { getGitHubQueryGenerator } from '../src/index'
import { print } from 'graphql'

import * as dotenv from 'dotenv'
dotenv.config()

if (!process.env.GITHUB_ACCESS_TOKEN) {
  throw new Error('Cannot run tests without a GitHub access token.')
}

const gitHubAccessToken: string = process.env.GITHUB_ACCESS_TOKEN

test('Generate random GitHub query', () => {
  return getGitHubQueryGenerator(gitHubAccessToken).then(
    (gitHubQueryGenerator) => {
      const query = gitHubQueryGenerator.generateRandomGitHubQuery()
      const { queryDocument, variableValues } = query

      console.log(print(queryDocument))
      console.log(JSON.stringify(variableValues, null, 2))

      expect(queryDocument).toBeTruthy()
    }
  )
})
