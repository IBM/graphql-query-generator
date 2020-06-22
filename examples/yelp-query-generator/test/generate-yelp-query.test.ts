import { getYelpQueryGenerator } from '../src/index'
import { print } from 'graphql'

import * as dotenv from 'dotenv'
dotenv.config()

if (!process.env.YELP_ACCESS_TOKEN) {
  throw new Error('Cannot run tests without a Yelp access token.')
}

const yelpAccessToken: string = process.env.YELP_ACCESS_TOKEN

test('Generate random Yelp query', () => {
  return getYelpQueryGenerator(yelpAccessToken).then((yelpQueryGenerator) => {
    const query = yelpQueryGenerator.generateRandomYelpQuery()
    const { queryDocument, variableValues } = query

    console.log(print(queryDocument))
    console.log(JSON.stringify(variableValues, null, 2))

    expect(queryDocument).toBeTruthy()
  })
}, 10000) // Needs to be longer to prevent overquerying the Yelp API
