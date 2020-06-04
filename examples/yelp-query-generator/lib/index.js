"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYelpQueryGenerator = void 0;
const fs = require("fs");
const path = require("path");
const graphql_1 = require("graphql");
const graphql_query_generator_1 = require("graphql-query-generator");
const yelp_providers_1 = require("./yelp-providers");
class YelpQueryGenerator {
  constructor(yelpSchema, yelpQueryConfig) {
    this.yelpSchema = yelpSchema;
    this.yelpQueryConfig = yelpQueryConfig;
  }
  generateRandomYelpQuery() {
    return graphql_query_generator_1.generateRandomQuery(
      this.yelpSchema,
      this.yelpQueryConfig
    );
  }
}
function getYelpQueryGenerator(yelpAccessToken) {
  return new Promise((resolve, reject) => {
    const yelpSchemaStr = fs
      .readFileSync(path.resolve(__dirname, "../fixtures/yelp.graphql"))
      .toString();
    const yelpSchema = graphql_1.buildSchema(yelpSchemaStr);
    yelp_providers_1.getProviderMap(yelpAccessToken).then((yelpProviders) => {
      resolve(
        new YelpQueryGenerator(yelpSchema, {
          breadthProbability: 0.5,
          depthProbability: 0.5,
          maxDepth: 4,
          providerMap: yelpProviders,
          argumentsToConsider: [
            // to get queries of varying sizes:
            "limit",
            // for 'search' and 'event_search':
            "location",
            // for 'search':
            "term",
            // for 'reviews', 'search', and 'event_search':
            "offset",
            // for 'business' and 'event':
            "id",
            // for 'reviews':
            "business",
          ],
          considerUnions: true,
          pickNestedQueryField: true,
        })
      );
    });
  });
}
exports.getYelpQueryGenerator = getYelpQueryGenerator;
//# sourceMappingURL=index.js.map
