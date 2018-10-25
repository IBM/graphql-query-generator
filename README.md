# GraphQL Query Generator
Generate randomized GraphQL queries from a given schema. All [arguments](https://facebook.github.io/graphql/draft/#sec-Language.Arguments) are exposed as [variables](https://facebook.github.io/graphql/draft/#sec-Language.Variables).

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

## Providing variable values
Whenever a randomly generated query requires an [argument](https://facebook.github.io/graphql/draft/#sec-Language.Arguments), this library exposes that argument as a [variable](https://facebook.github.io/graphql/draft/#sec-Language.Variables). The name of those variables reflect the type and field that the argument applies to, as well as the argument name like so:

```
<type>__<fieldName>__<argumentName>
```

This library exposes a function to provide values for these variables:

* `provideVariables(query: DocumentNode, providerMap: ProviderMap, schema: GraphQLSchema)`: Provides values for variables in the given query as defined in the given providerMap.

### Provider map
The `providerMap` is responsible for providing values for the variables in a query.

The keys of the `providerMap` are either the exact name of the variable or a wildcard where either the `type`, `fieldName`, and/or `argumentName` are replaced by a `*`. For example, the key `*__*__limit` matches all variables for arguments of name `limit`, no matter for what field the argument is used or in which type.

reThe values of the `providerMap` are either the concrete argument values, or a function that will be invoked to provide that value. Note that for variables with an [enumeration type](https://graphql.org/learn/schema/#enumeration-types), `provideVariables` automatically chooses one value at random.
