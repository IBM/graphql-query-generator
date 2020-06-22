import * as fs from 'fs'
import * as path from 'path'
import { buildSchema, GraphQLSchema } from 'graphql'
import { generateRandomQuery, Configuration } from 'ibm-graphql-query-generator'
import { getProviderMap } from './yelp-providers'

class YelpQueryGenerator {
  yelpSchema: GraphQLSchema
  yelpQueryConfig: Configuration

  constructor(yelpSchema: GraphQLSchema, yelpQueryConfig: Configuration) {
    this.yelpSchema = yelpSchema
    this.yelpQueryConfig = yelpQueryConfig
  }

  public generateRandomYelpQuery() {
    return generateRandomQuery(this.yelpSchema, this.yelpQueryConfig)
  }
}

export function getYelpQueryGenerator(yelpAccessToken: string) {
  return new Promise<YelpQueryGenerator>((resolve, reject) => {
    const yelpSchemaStr = fs
      .readFileSync(path.resolve(__dirname, '../fixtures/yelp.graphql'))
      .toString()
    const yelpSchema = buildSchema(yelpSchemaStr)
    getProviderMap(yelpAccessToken).then((yelpProviders) => {
      resolve(
        new YelpQueryGenerator(yelpSchema, {
          breadthProbability: 0.5,
          depthProbability: 0.5,
          maxDepth: 4, // Yelp enforces a depth limit of 4
          providerMap: yelpProviders,
          argumentsToConsider: [
            // to get queries of varying sizes:
            'limit',
            // for 'search' and 'event_search':
            'location',
            // for 'search':
            'term',
            // for 'reviews', 'search', and 'event_search':
            'offset',
            // for 'business' and 'event':
            'id',
            // for 'reviews':
            'business'
          ],
          considerUnions: true,
          pickNestedQueryField: true
        })
      )
    })
  })
}
