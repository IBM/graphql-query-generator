import {
  Kind,
  GraphQLNamedType
} from 'graphql'
import { Configuration } from './generate-query'

type Primitive = string | boolean | number | Date
type Variables = {
  [varName: string] : any
}

type ProviderFunction = (variables: Variables, argType?: GraphQLNamedType) => any | // For type__field__argument providers
  { [argumentName: string]: any } // For type__field providers

export type ProviderMap = {
  [varNameQuery: string] : Primitive | Object | Array<any> | ProviderFunction
}

function doMatch (a: string, b: string) : boolean {
  return a === b || a === '*' || b === '*'
}

export function matchVarName (query: string, candidates: string[]) : string {
  // case: exact match:
  if (candidates.includes(query)) {
    return query
  }

  const queryParts = query.split(/(?<!__)__/g)
  if (!(queryParts.length === 2 || queryParts.length === 3)) {
    throw new Error(`Invalid variable name query: ${query}`)
  }

  for (let candidate of candidates) {
    const candidateParts = candidate.split(/(?<!__)__/g)
    if (!(candidateParts.length === 2 || candidateParts.length === 3)) {
      throw new Error(`Invalid variable name: ${candidate}`)
    }

    if (candidateParts.length === queryParts.length) {
      const match = candidateParts.every((candPart, i) => {
        return doMatch(candPart, queryParts[i])
      })
      if (match) {
        return candidate
      }
    }
  }

  return null
}

function getProvider (varName: string, providerMap: ProviderMap) {
  const providerKey = matchVarName(varName, Object.keys(providerMap))

  if (providerKey) {
    return providerMap[providerKey]
  } else {
    return null
  }
}

export function getRandomEnum (type: GraphQLNamedType) {
  const typeDef = type.astNode
  if (typeof typeDef !== 'undefined' && typeDef.kind === Kind.ENUM_TYPE_DEFINITION) {
    let value = typeDef.values[Math.floor(Math.random() * typeDef.values.length)]
    return value.name.value
  }
}

export function isEnumType (type: GraphQLNamedType) : boolean {
  const typeDef = type.astNode
  if (typeof typeDef !== 'undefined' && typeDef.kind === Kind.ENUM_TYPE_DEFINITION) {
    return true
  }
  return false
}

export function getProviderValue (
  varName: string,
  config: Configuration,
  providedValues: Variables,
  argType?: GraphQLNamedType
) {
  // If no providerMap was provided, then just create a query with no argument values
  if (config.providerMap) {
    const provider = getProvider(varName, config.providerMap)

    if (typeof provider === 'function') {
      return (provider as ProviderFunction)(providedValues, argType)
    } else {
      return provider
    }
  } else {
    return null
  }
}
