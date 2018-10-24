import { DocumentNode, OperationDefinitionNode } from "graphql";

type Primitive = string | boolean | number | Date

export type ProviderMap = {
  [argTriple: string] : Primitive | Object | Array<any> | Function
}

function getProvider (providerMap: ProviderMap, varName: string) {
  // case: exact match
  if (typeof providerMap[varName] !== 'undefined') {
    return providerMap[varName]
  }

  // case: wildcard match
  let result = null
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
      result = providerMap[providerName]
    }
  })

  return result
}

export function provideVariables (
  query: DocumentNode,
  providerMap: ProviderMap
) : {
  [variableName: string] : Primitive | Object | Array<any>
} {
  const operationDefinitions = query.definitions
    .filter(d => d.kind === 'OperationDefinition')
  if (operationDefinitions.length === 0) {
    throw new Error(`Given query has no operation definition`)
  }

  // we know that we have an operation defintion node at this point:
  const operationDefinition = (operationDefinitions[0] as OperationDefinitionNode)

  const variables = {}
  operationDefinition.variableDefinitions.forEach(varDef => {
    const varName = varDef.variable.name.value
    const provider = getProvider(providerMap, varName)
    let varValue = null

    if (!provider) {
      throw new Error(`No provider defined for variable "${varName}"`)
    } else if (typeof provider === 'function') {
      varValue = provider()
    } else {
      varValue = provider
    }

    variables[varName] = varValue
  })
  return variables
}
