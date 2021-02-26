import * as dotenv from 'dotenv'
dotenv.config()

import { print, DocumentNode } from 'graphql'
import * as fs from 'fs'

import { YelpQueryGenerator, getYelpQueryGenerator } from './index'
import { runYelpGraphQLQuery } from './yelp-providers'

// The number of randomly generated queries that should be created
const ITERATIONS = 5000
// Execute the query to get the response
const withResponse = true

function iterate(f: (i: number) => Promise<void>, n: number): Promise<void> {
  let p = Promise.resolve()
  for (let i = 0; i < n; i++) {
    p = p.then((_) => {
      return f(i)
    })
  }
  return p
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getEntry(
  token: string,
  queryGenerator: YelpQueryGenerator,
  id: number,
  fd: number
) {
  try {
    const {
      queryDocument,
      variableValues
    } = queryGenerator.generateRandomYelpQuery()
    const query = print(queryDocument)
    const request = { query, variables: variableValues }
    await delay(1000)
    const data = withResponse
      ? await runYelpGraphQLQuery('json', JSON.stringify(request), token)
      : null
    const timestamp = Date.now()
    const entry = {
      id,
      timestamp,
      query,
      variableValues,
      response: { data }
    }
    console.log(`Generated query ${id + 1} out of ${ITERATIONS}`)
    fs.write(
      fd,
      `${JSON.stringify(entry, null, 2)}${id < ITERATIONS - 1 ? ',' : ''}\n`,
      (err) => {
        if (err) console.log('Error writing file:', err)
      }
    )
  } catch (error) {
    console.log(`Error while generating query ${id}: ${error}`)
    await getEntry(token, queryGenerator, id, fd)
  }
}

if (process.env.YELP_ACCESS_TOKEN) {
  getYelpQueryGenerator(process.env.YELP_ACCESS_TOKEN).then(
    (queryGenerator) => {
      const token = process.env.YELP_ACCESS_TOKEN || ''
      const fd = fs.openSync('./query-corpus/yelp-query.json', 'w')
      fs.write(fd, `[\n`, (err) => {
        if (err) console.log('Error writing file:', err)
      })
      iterate((i) => getEntry(token, queryGenerator, i, fd), ITERATIONS)
        .then(() => {
          fs.write(fd, `]\n`, (err) => {
            if (err) console.log('Error writing file:', err)
          })
          fs.close(fd, (err) => {
            if (err) console.log('Error closing file:', err)
          })
          console.log('Finished generating query corpus')
        })
        .catch((err) => {
          console.log('Finished generating query corpus with error' + err)
        })
    }
  )
} else {
  console.log('Please provide a Yelp access token')
}
