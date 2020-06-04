# Yelp GraphQL Query Generator

Generates random GraphQL queries for the Yelp API.

### Usage

The query generator dynamically creates [providers](https://github.com/IBM/GraphQL-Query-Generator#provider-map) by querying the Yelp API for data. In order to do so, you must provide your Yelp credentials.

Create a file named `.env` with your Yelp [API key](https://www.yelp.com/developers/documentation/v3/authentication).

```
YELP_ACCESS_TOKEN={your API key}
```

Install the example library.

```
npm install .
```

The following JavaScript code, when executed from the current directory, uses the `getYelpQueryGenerator()` factory method to create a `YelpQueryGenerator` object, which can be used to generate queries.

```javascript
require("dotenv").config();

const { getYelpQueryGenerator } = require("./lib/index");
const { print } = require("graphql");

getYelpQueryGenerator(process.env.YELP_ACCESS_TOKEN).then((queryGenerator) => {
  const query = queryGenerator.generateRandomYelpQuery();
  const { queryDocument, variableValues } = query;

  console.log(print(queryDocument));
  console.log(JSON.stringify(variableValues, null, 2));
});
```

### Disclaimer

Queries are associated with a particular version of a GraphQL schema. Due to the natural evolution of the Yelp API, the generated queries may not work with the current version of the API. The generated queries may contain deprecated fields and the new API may require new arguments for certain fields. However, the generated queries are valid and would have worked with the version of the API at the time.
