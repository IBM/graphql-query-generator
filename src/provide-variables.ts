import {
  Kind,
  GraphQLNamedType
} from 'graphql'
import { Configuration } from './generate-query'

type Primitive = string | boolean | number | Date
type Variables = {
  [varName: string] : any
}
type ProviderFunction = (variables: Variables, argType: GraphQLNamedType) => any

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
  if (queryParts.length !== 3) {
    throw new Error(`Invalid variable name query: ${query}`)
  }
  for (let candidate of candidates) {
    const candidateParts = candidate.split(/(?<!__)__/g)
    if (candidateParts.length !== 3) {
      throw new Error(`Invalid variable name: ${candidate}`)
    }
    const match = candidateParts.every((candPart, i) => {
      return doMatch(candPart, queryParts[i])
    })
    if (match) {
      return candidate
    }
  }

  return null
}

function getProvider (varName: string, type: GraphQLNamedType, providerMap: ProviderMap) {
  // case: no providers:
  if (typeof providerMap === 'undefined') {
    throw new Error(`No provider found for "${varName}" because provider map ` +
    `is undefined.`)
  }

  const providerKey = matchVarName(varName, Object.keys(providerMap))

  // throw error if no provider was found:
  if (!providerKey && !isEnumType(type)) {
    throw new Error(`No provider found for "${varName}" in ` +
      `${Object.keys(providerMap).join(', ')}. ` +
      `Consider applying wildcard provider with "*__*__*"`)
  }

  return providerMap[providerKey]
}

function getRandomEnum (type: GraphQLNamedType) {
  const typeDef = type.astNode
  if (typeof typeDef !== 'undefined' && typeDef.kind === Kind.ENUM_TYPE_DEFINITION) {
    let value = typeDef.values[Math.floor(Math.random() * typeDef.values.length)]
    return value.name.value
  }
}

function isEnumType (type: GraphQLNamedType) : boolean {
  const typeDef = type.astNode
  if (typeof typeDef !== 'undefined' && typeDef.kind === Kind.ENUM_TYPE_DEFINITION) {
    return true
  }
  return false
}

export function provideVariableValue (
  varName: string,
  type: GraphQLNamedType,
  config: Configuration,
  providedValues: Variables
) {
  const provider = getProvider(varName, type, config.providerMap)

  let varValue = null
  if (isEnumType(type)) {
    varValue = getRandomEnum(type)
  } else if (typeof provider === 'function') {
    varValue = (provider as ProviderFunction)(providedValues, type)
  } else {
    varValue = provider
  }

  return varValue
}
