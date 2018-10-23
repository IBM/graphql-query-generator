# GraphQL Query Generator
Generate randomized GraphQL queries from a given schema. All [arguments](https://facebook.github.io/graphql/draft/#sec-Language.Arguments) are exposed as [variables](https://facebook.github.io/graphql/draft/#sec-Language.Variables).

## Usage
This library exposes two functions:

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
