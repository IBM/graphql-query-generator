# GraphQL Query Generator
Generate randomized GraphQL queries from a given schema. All [arguments](https://facebook.github.io/graphql/draft/#sec-Language.Arguments) are exposed as [variables](https://facebook.github.io/graphql/draft/#sec-Language.Variables). _Providers_ can be passed to provide values for these variables. For example:

```javascript
import { generateRandomQuery } from 'this-library'

const configuration = {
  depthProbability: 0.1,
  breadthProbability: 0.2,
  providerMap: {
    '*__marketplaceCategory__slug': (providedValues) => {
      return 'testing'
    }
  }
}
const {queryDocument, variableValues, seed} = generateRandomQuery(gitHubSchema, configuration)
/**
 * Printing the queryDocument with graphql.print(queryDocument):
 * 
 *   query RandomQuery($Query__marketplaceCategory__slug: String!) {
 *     marketplaceCategory(slug: $Query__marketplaceCategory__slug) {
 *       howItWorks
 *       name
 *       secondaryListingCount
 *     }
 *   }
 * 
 * ...and the variableValues would be:
 * 
 *   {
 *     "Query__marketplaceCategory__slug": "testing"
 *   }
 */
```

## Generating random queries
This library exposes two functions for generating random GraphQL queries:

* `getRandomQuery(schema: GraphQLSchema, config: Configuration)`: Produces a random query from the given schema, and considering the passed configuration.
* `getRandomMutation(schema: GraphQLSchema, config: Configuration)`: Produces a random mutation from the given schema, and considering the passed configuration.


### Configuration
Functions of this library accept a configuration object with the following properties:

* `depthProbability` (type: `number`, default: `0.5`): The probability (from `0` to `1`) that, if existent, fields that themselves have subfields are selected at every level of the generated query. The number of so selected fields depends on the `breadthProbability`.
* `breadthProbability` (type: `number`, default: `0.5`): The probability (from `0` to `1`) that a field (nested or flat) is selected at every level of the generated query.
* `maxDepth` (type: `number`, default: `5`): The maximum depths of the query / mutation to generate. This library ensures that leave nodes do not requir children fields to be selected.
* `ignoreOptionalArguments` (type: `boolean`, default: `true`): If set to `true`, non-mandatory arguments will not be included in the generated query / mutation.
* `argumentsToIgnore` (type: `string[]`, default: `[]`): List of argument names that should be ignored in any case. If non-null arguments are configured to be ignored, an error will be thrown.
* `argumentsToConsider` (type: `string[]`, default: `[]`): List of argument names that should be considered, even if the argument is optional and `ignoreOptionalArguments` is set to `true`.
* `providerMap` (type: `{[varNameQuery: string] : any}`, default: `{'*__*__*': null}`): Map of values or functions to provide values for the variables present in the generated query / mutation. See details below.
* `considerInterfaces` (type: `boolean`, default: `false`): Create queries containing interfaces (by calling fields in the interfaces and/or creating fragments on objects implementing the interfaces)
* `considerUnions` (type: `boolean`, default: `false`): Create queries containing unions (by creating fragments on objects of the unions)
* `seed` (type: `number`, optional): Allows the generator to produce queries deterministically based on a random number generator seed. If no seed is provided, a random seed will be provided. The seed that is used to produce the query, whether user-provided or randomly generated, will be included in the output.

### Provider map
Whenever a randomly generated query or mutation requires an [argument](https://facebook.github.io/graphql/draft/#sec-Language.Arguments), this library exposes that argument as a [variable](https://facebook.github.io/graphql/draft/#sec-Language.Variables). The names of these variables reflect the type and field that the argument applies to, as well as the argument name like so:

```
<type>__<fieldName>__<argumentName>
```

The `providerMap` contains values or value producing functions for the variables in a query.

The keys of the `providerMap` are either the exact name of the variable or a wildcard where either the `type`, `fieldName`, and/or `argumentName` are replaced by a `*`. For example, the key `*__*__limit` matches all variables for arguments of name `limit`, no matter for what field the argument is used or in which type. If no `providerMap` is passed, a default map `{'*__*__*': null}` is used, which provides a `null` value to all variables (Note: this can be problematic if an argument defines a [non-null](https://facebook.github.io/graphql/draft/#sec-Type-System.Non-Null) value).

The values of the `providerMap` are either the concrete argument values, or a function that will be invoked to provide that value. A provider function will get passed a map of all already provided variable values, which allows to provide values based on previous ones. This library also exposes a function `matchVarName(query: string, candidates: string[]) : string` that, from a given list of variable names and/or variable name queries, finds the one matching the given variable name or query.

Note that for variables with an [enumeration type](https://graphql.org/learn/schema/#enumeration-types), this lirbrary automatically chooses one value at random.


### Errors
Generating random queries or mutations may fail in some cases:

* An error is thrown if a query hits the defined `maxDepth`, but there are only fields with children to choose from. Choosing such a field but then not choosing a sub-field for it (due to the `maxDepth` constraint) would result in an invalid query and thus causes this library to throw an error.
* An error is thrown if there is no provider defined for a variable in the generated query.
