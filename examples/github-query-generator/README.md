# GitHub GraphQL Query Generator

Generates random GraphQL queries for the [GitHub GraphQL API](https://developer.github.com/v4/explorer/).

### Usage

The query generator dynamically creates [providers](https://github.com/IBM/GraphQL-Query-Generator#provider-map) by querying the GitHub API for data. In order to do so, you must provide your GitHub credentials.

Create a file named `.env` with your GitHub [personal access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line).

```
GITHUB_ACCESS_TOKEN={your access token}
```

Use the `getGitHubQueryGenerator()` factory method to create a `GitHubQueryGenerator` object, which can be used to generate queries.

```javascript
require("dotenv").config();

const { getGitHubQueryGenerator } = require("./lib/index");
const { print } = require("graphql");

getGitHubQueryGenerator(process.env.GITHUB_ACCESS_TOKEN).then(
  (queryGenerator) => {
    const query = queryGenerator.generateRandomGitHubQuery();
    const { queryDocument, variableValues } = query;

    console.log(print(queryDocument));
    console.log(JSON.stringify(variableValues, null, 2));
  }
);
```

### Disclaimer

Queries are associated with a particular version of a GraphQL schema. The generated GitHub queries are associated with this [version](https://github.com/octokit/graphql-schema/blob/2a4687027d43125f92121aaa1a7d9f062d10a29e/schema.graphql) of the GitHub schema.

Due to the natural evolution of the GitHub API, the generated queries may not work with the current version of the API. The generated queries may contain deprecated fields and the new API may require new arguments for certain fields. However, the generated queries are valid and would have worked with the version of the API at the time.
