# GitHub GraphQL Query Generator

Generates random GraphQL queries for the [GitHub GraphQL API](https://developer.github.com/v4/explorer/).

### Usage

Clone the example library.

Install the dependencies.

```bash
npm ci
```

The query generator dynamically creates [providers](https://github.com/IBM/GraphQL-Query-Generator#provider-map) by querying the GitHub API for data. In order to do so, you must provide your GitHub credentials.

Create a file named `.env` with your GitHub [personal access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line).

```
GITHUB_ACCESS_TOKEN={your access token}
```

Use the `getGitHubQueryGenerator()` factory method to create a `GitHubQueryGenerator` object, which can be used to generate queries.

```javascript
require("dotenv").config()

const { getGitHubQueryGenerator } = require("./lib/index")
const { print } = require("graphql")

getGitHubQueryGenerator(process.env.GITHUB_ACCESS_TOKEN).then(
  (queryGenerator) => {
    const query = queryGenerator.generateRandomGitHubQuery()
    const { queryDocument, variableValues } = query

    console.log(print(queryDocument))
    console.log(JSON.stringify(variableValues, null, 2))
  }
)
```

## Generating a query corpus

We provided a script that can generate a corpus of 5,000 randomly generated GitHub queries and responses.

To create the corpus, please provide your GitHub access token in a `.env` file, as described in the previous section.

Then, run:

```bash
npm run generate-corpus
```

The corpus will be saved into the [query-corpus/](query-corpus/) folder.

### Disclaimer

Queries are associated with a particular version of a GraphQL schema. The generated GitHub queries are associated with this [version](https://github.com/octokit/graphql-schema/blob/1831fcbb21476aabe94af46aee84f063df50a377/schema.graphql) of the GitHub schema.

Due to the natural evolution of the GitHub API, the generated queries may not work with the current version of the API. The generated queries may contain deprecated fields and the new API may require new arguments for certain fields. However, the generated queries are valid and would have worked with the version of the API at the time.
