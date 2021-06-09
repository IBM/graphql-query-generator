import { Kind, GraphQLNamedType, TypeNode } from 'graphql'
import { Configuration } from './generate-query'

type Variables = { [varName: string]: any }

export type ProviderFunction = (
  variables: Variables,
  argType?: GraphQLNamedType
) =>
  | any // For type__field__argument providers
  | { [argumentName: string]: any } // For type__field providers

export type ProviderMap = {
  [varNameQuery: string]: any | ProviderFunction
}

function doMatch(a: string, b: string): boolean {
  return a === b || a === '*' || b === '*'
}

export function matchVarName(query: string, candidates: string[]): string {
  // Case: exact match
  if (candidates.includes(query)) {
    return query
  }

  const queryParts = query.split(/__(?!__)/g)
  if (!(queryParts.length === 2 || queryParts.length === 3)) {
    throw new Error(`Invalid variable name query: ${query}`)
  }

  for (let candidate of candidates) {
    const candidateParts = candidate.split(/__(?!__)/g)
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

export function getProvider(
  varName: string,
  providerMap: ProviderMap
): {
  providerFound: boolean
  provider: any | ProviderFunction
} {
  const providerKey = matchVarName(varName, Object.keys(providerMap))

  if (providerKey) {
    return {
      providerFound: true,
      provider: providerMap[providerKey]
    }
  } else {
    return {
      providerFound: false,
      provider: null
    }
  }
}

export function getRandomEnum(type: GraphQLNamedType) {
  const typeDef = type.astNode
  if (
    typeof typeDef !== 'undefined' &&
    typeDef.kind === Kind.ENUM_TYPE_DEFINITION
  ) {
    let value =
      typeDef.values[Math.floor(Math.random() * typeDef.values.length)]
    return value.name.value
  }
}

export function isEnumType(type: GraphQLNamedType): boolean {
  const typeDef = type.astNode
  if (
    typeof typeDef !== 'undefined' &&
    typeDef.kind === Kind.ENUM_TYPE_DEFINITION
  ) {
    return true
  }
  return false
}

export function getProviderValue(
  varName: string,
  config: Configuration,
  providedValues: Variables,
  argType?: GraphQLNamedType
): {
  providerFound: boolean
  value: any
} {
  const { providerFound, provider } = getProvider(varName, config.providerMap)

  return {
    providerFound,
    value:
      typeof provider === 'function'
        ? (provider as ProviderFunction)(providedValues, argType)
        : provider
  }
}

export function getDefaultArgValue(type: TypeNode) {
  if (type.kind === 'NamedType') {
    if (type.name.value === 'Int') {
      return 10
    } else if (type.name.value === 'Float') {
      return 10.0
    } else if (type.name.value === 'Boolean') {
      return true
    } else {
      // Case: String, ID, or custom scalar:
      return 'PLACEHOLDER'
    }
  } else if (type.kind === 'NonNullType') {
    return getDefaultArgValue(type.type)
  } else if (type.kind === 'ListType') {
    return [getDefaultArgValue(type.type)]
  }
}
