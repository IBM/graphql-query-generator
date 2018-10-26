import {
  Kind,
  GraphQLNamedType
} from 'graphql'
import { Configuration } from './generate-query'

type Primitive = string | boolean | number | Date

export type ProviderMap = {
  [varNameQuery: string] : Primitive | Object | Array<any> | Function
}

function getProvider (varName: string, providerMap: ProviderMap) {
  // case: no providers:
  if (typeof providerMap === 'undefined') {
    throw new Error(`No provider found for "${varName}" in ` +
      `${JSON.stringify(providerMap)}. ` +
      `Consider applying wildcard provider with "*__*__*"`)
  }

  // case: exact match
  if (typeof providerMap[varName] !== 'undefined') {
    return providerMap[varName]
  }

  // case: wildcard match
  let provider = null
  let providerFound = false
  const varNameParts = varName.split('__')
  if (varNameParts.length !== 3) {
    throw new Error(`Invalid variable name "${varName}"`)
  }
  function doMatch (a: string, b: string) : boolean {
    return a === b || a === '*' || b === '*'
  }
  Object.keys(providerMap).forEach(providerName => {
    const providerNameParts = providerName.split('__')
    if (varNameParts.length !== 3) {
      throw new Error(`Invalid provider name "${varName}"`)
    }
    const match = varNameParts.every((varNamePart, i) => {
      return doMatch(varNamePart, providerNameParts[i])
    })
    if (match) {
      providerFound = true
      provider = providerMap[providerName]
    }
  })

  // throw error if no provider was found:
  if (!providerFound) {
    throw new Error(`No provider found for "${varName}" in ` +
      `${JSON.stringify(providerMap)}. ` +
      `Consider applying wildcard provider with "*__*__*"`)
  }

  return provider
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

export function provideVaribleValue (
  varName: string,
  type: GraphQLNamedType,
  config: Configuration,
  providedValues: {[varName: string] : any}
) {
  const provider = getProvider(varName, config.providerMap)

  let varValue = null
  if (isEnumType(type)) {
    varValue = getRandomEnum(type)
  } else if (typeof provider === 'function') {
    varValue = provider(providedValues)
  } else {
    varValue = provider
  }

  return varValue
}
