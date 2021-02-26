import * as fetch from 'node-fetch'
import { ProviderMap } from 'ibm-graphql-query-generator/lib/provide-variables'

export function runYelpGraphQLQuery(
  kind: 'graphql' | 'json',
  query: string,
  yelpAccessToken: string
) {
  return new Promise((resolve, reject) => {
    fetch
      .default('https://api.yelp.com/v3/graphql', {
        method: 'POST',
        body: query,
        headers: {
          Authorization: `Bearer ${yelpAccessToken}`,
          'Content-Type': `application/${kind}`
        }
      })
      .then((res) => {
        if (res.status === 200) {
          return res.json()
        } else if (res.status === 401) {
          throw new Error(
            `Unauthorized Yelp API call: ${res.status} ${res.statusText}. Did you provide a valid Yelp access token?`
          )
        } else {
          console.error(`Failed query: ${query}`)
          throw new Error(
            `Unsuccessful Yelp API call: ${res.status} ${res.statusText}.`
          )
        }
      })
      .then((json) => {
        resolve(json.data)
      })
      .catch(reject)
  })
}

export function getBusinessesQuery(location: string) {
  return `{
    search(limit: 50, location: "${location}") {
      business {
        id
        name
        phone
        location {
          address1
          city
          state
          country
        }
      }
    }
  }`
}

export const eventsQuery = `{
  event_search(limit: 50) {
    events {
      id
    }
  }
}`

const searchTerms = ['asian', 'italian', 'mexican', 'japanese', 'burger']

export const locations = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Detroit',
  'Boston',
  'San Francisco',
  'Seattle',
  'New Orleans',
  'Miami',
  'Portland'
]

type Business = {
  id: string
  name: string
  phone: string
  location: {
    address1: string
    city: string
    state: string
    country: string
  }
}

type Event = {
  id: string
}

export function extractBusinesses(data: any): Business[] {
  return data.search.business
}

function extractEvents(data: any): Event[] {
  return data.event_search.events
}

/**
 * Standard Normal variate using Box-Muller transform.
 *
 * See: https://stackoverflow.com/a/36481059/1023827
 */
function randomBm(): number {
  let u = 0,
    v = 0
  while (u === 0) u = Math.random() // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random()
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  num = num / 10.0 + 0.5 // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomBm() // Resample between 0 and 1
  return num
}

/**
 * Returns random integer, normally distributed around the passed expected value
 */
function getRandomInt() {
  return Math.floor(randomBm() * 15)
}

function getRandomSearchTerm() {
  const index = Math.floor(Math.random() * searchTerms.length)
  return searchTerms[index]
}

function getRandomLocation() {
  const index = Math.floor(Math.random() * locations.length)
  return locations[index]
}

export function getProviderMap(yelpAccessToken: string) {
  return new Promise<ProviderMap>((resolve, reject) => {
    const businessesPromise = new Promise<Business[]>((resolve, reject) => {
      Promise.all(
        // Run the business search query on all locations
        locations.map((location, i) => {
          return new Promise((resolve, reject) => {
            // Delay the requests, otherwise will receive status: 429 Too Many Requests
            setTimeout(() => {
              runYelpGraphQLQuery(
                'graphql',
                getBusinessesQuery(location),
                yelpAccessToken
              )
                .then((data) => resolve(extractBusinesses(data)))
                .catch((error) =>
                  reject(`Could not fetch businesses. ${error}`)
                )
            }, i * 500)
          })
        })
      ).then((values) => {
        // Concatenate all the businesses across all locations
        resolve(([] as Business[]).concat(...(values as Business[][])))
      })
    })

    const eventsPromise = new Promise<Event[]>((resolve, reject) => {
      runYelpGraphQLQuery('graphql', eventsQuery, yelpAccessToken)
        .then((data) => {
          resolve(extractEvents(data))
        })
        .catch((error) => {
          reject(`Could not fetch events. ${error}`)
        })
    })

    Promise.all([businessesPromise, eventsPromise]).then((values) => {
      const [businesses, events] = values as [Business[], Event[]]

      function getRandomBusinessMatch() {
        const index = Math.floor(Math.random() * businesses.length)
        const business = businesses[index]
        return {
          name: business.name,
          address1: business.location.address1,
          city: business.location.city,
          state: business.location.state,
          country: business.location.country
        }
      }

      function getRandomBusinessId() {
        const index = Math.floor(Math.random() * businesses.length)
        return businesses[index].id
      }

      function getRandomEventId() {
        const index = Math.floor(Math.random() * events.length)
        return events[index].id
      }

      function getRandomPhoneNumber() {
        const index = Math.floor(Math.random() * businesses.length)
        return businesses[index].phone
      }

      resolve({
        '*__*__limit': getRandomInt,
        Query__business_match: getRandomBusinessMatch,
        '*__reviews__business': getRandomBusinessId,
        '*__phone_search__phone': getRandomPhoneNumber,
        '*__*__term': getRandomSearchTerm,
        '*__*__location': getRandomLocation,
        '*__*__offset': getRandomInt,
        '*__event__id': getRandomEventId,
        '*__business__id': getRandomBusinessId
      })
    })
  })
}
