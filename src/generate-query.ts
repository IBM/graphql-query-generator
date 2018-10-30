import {
  OperationDefinitionNode,
  Location,
  DocumentNode,
  SelectionSetNode,
  DefinitionNode,
  GraphQLSchema,
  FieldDefinitionNode,
  SelectionNode,
  TypeNode,
  ArgumentNode,
  NameNode,
  VariableDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  getNamedType
} from 'graphql'
import { ProviderMap, provideVaribleValue } from './provide-variables';

export type Configuration = {
  depthProbability?: number,
  breadthProbability?: number,
  maxDepth?: number,
  ignoreOptionalArguments?: boolean,
  argumentsToIgnore?: string[],
  argumentsToConsider?: string[],
  providerMap?: ProviderMap
}

const DEFAULT_CONFIG : Configuration = {
  depthProbability: 0.5,
  breadthProbability: 0.5,
  maxDepth: 5,
  ignoreOptionalArguments: true,
  argumentsToIgnore: [],
  argumentsToConsider: []
}

// default loc:
const loc : Location = {
  start: 0,
  end: 0,
  startToken: null,
  endToken: null,
  source: null
}

function getDocumentDefinition (definitions) : DocumentNode {
  return {
    kind: Kind.DOCUMENT,
    definitions,
    loc
  }
}

function getQueryOperationDefinition (
  schema: GraphQLSchema,
  config: Configuration
) : {
  queryDocument: OperationDefinitionNode,
  variableValues: {[varName: string] : any}
 } {
  const node = schema.getQueryType().astNode
  const {
    selectionSet,
    variableDefinitionsMap,
    variableValues
  } = getSelectionSetAndVars(schema, node, config)
  
  // throw error if query would be empty:
  if (selectionSet.selections.length === 0) {
    throw new Error(`Could not create query - no selection was possible at the root level`)
  }

  return {
    queryDocument: {
      kind: Kind.OPERATION_DEFINITION,
      operation: 'query',
      selectionSet,
      variableDefinitions: Object.values(variableDefinitionsMap),
      loc,
      name: getName('RandomQuery')
    },
    variableValues
  }
}

function getMutationOperationDefinition(
  schema: GraphQLSchema,
  config: Configuration
) : {
  mutationDocument: OperationDefinitionNode,
  variableValues: {[varName: string] : any}
} {
  const node = schema.getMutationType().astNode
  const {
    selectionSet,
    variableDefinitionsMap,
    variableValues
  } = getSelectionSetAndVars(schema, node, config)
  
  // throw error if mutation would be empty:
  if (selectionSet.selections.length === 0) {
    throw new Error(`Could not create mutation - no selection was possible at the root level`)
  }

  return {
    mutationDocument: {
      kind: Kind.OPERATION_DEFINITION,
      operation: 'mutation',
      selectionSet,
      variableDefinitions: Object.values(variableDefinitionsMap),
      loc,
      name: getName('RandomMutation')
    },
    variableValues
  }
}

export function getTypeName (type: TypeNode) : string {
  if (type.kind === Kind.NAMED_TYPE) {
    return type.name.value
  } else if (type.kind === Kind.LIST_TYPE) {
    return getTypeName(type.type)
  } else if (type.kind === Kind.NON_NULL_TYPE) {
    return getTypeName(type.type)
  } else {
    throw new Error(`Cannot get name of type: ${type}`)
  }
}

function isMandatoryType (type: TypeNode) : boolean {
  return type.kind === Kind.NON_NULL_TYPE
}

function getName (name: string) : NameNode {
  return {
    kind: Kind.NAME,
    value: name
  }
}

function isNestedField (field: FieldDefinitionNode, schema: GraphQLSchema) : boolean {
  return typeof schema.getType(getTypeName(field.type)).astNode !== 'undefined'
}

function isInterfaceField (field: FieldDefinitionNode, schema: GraphQLSchema) : boolean {
  const ast = schema.getType(getTypeName(field.type)).astNode
  return typeof ast !== 'undefined' && ast.kind === Kind.INTERFACE_TYPE_DEFINITION
}

function considerArgument (arg: InputValueDefinitionNode, config: Configuration) : boolean {
  const isArgumentToIgnore = config.argumentsToIgnore.includes(arg.name.value)
  const isArgumentToConsider = config.argumentsToConsider.includes(arg.name.value)
  const isMand = isMandatoryType(arg.type)
  const isOptional = !isMand

  // checks for consistency:
  if (isMand && isArgumentToIgnore) {
    throw new Error(`Cannot ignore non-null argument "${arg.name.value}"`)
  }

  if (isArgumentToIgnore && isArgumentToConsider) {
    throw new Error(`Cannot ignore AND consider argument "${arg.name.value}"`)
  }

  // return value based on options:
  if (isMand) {
    return true
  }

  if (isArgumentToConsider) {
    return true
  }

  if (isArgumentToIgnore) {
    return false
  }

  if (isOptional && config.ignoreOptionalArguments) {
    return false
  }
}

function isUnionField (field: FieldDefinitionNode, schema: GraphQLSchema) : boolean {
  const ast = schema.getType(getTypeName(field.type)).astNode
  return typeof ast !== 'undefined' && ast.kind === Kind.UNION_TYPE_DEFINITION
}

function getRandomFields (
  fields: ReadonlyArray<FieldDefinitionNode>,
  config: Configuration,
  schema: GraphQLSchema,
  depth: number
) : ReadonlyArray<FieldDefinitionNode> {
  const results = []

  // filter Interfaces and Unions (for now):
  const cleanFields = fields
    .filter(field => !isInterfaceField(field, schema))
    .filter(field => !isUnionField(field, schema))

  if (cleanFields.length === 0) {
    return results
  }

  const nested = cleanFields.filter(field => isNestedField(field, schema))
  const flat = cleanFields.filter(field => !isNestedField(field, schema))
  const nextIsLeaf = depth + 1 === config.maxDepth
  const pickNested = Math.random() <= config.depthProbability
  // console.log(` depth=${depth}, maxDepth=${config.maxDepth}, nextIsLeaf=${nextIsLeaf}, pickOneNested=${pickNested} cleanFields= ${cleanFields.map(f => f.name.value).join(', ')}`)

  // if depth probability is high, definitely chose one nested field if one exists:
  if (pickNested && nested.length > 0 && !nextIsLeaf) {
    let nestedIndex = Math.floor(Math.random() * nested.length)
    results.push(nested[nestedIndex])
    nested.splice(nestedIndex, 1)

    nested.forEach(field => {
      if (Math.random() <= config.breadthProbability) {
        results.push(field)
      }
    })
  }

  // pick flat fields based on the breadth probability:
  flat.forEach(field => {
    if (Math.random() <= config.breadthProbability) {
      results.push(field)
    }
  })

  // ensure to pick at least one field:
  if (results.length === 0) {
    if (!nextIsLeaf && cleanFields.length > 0) {
      results.push(cleanFields[Math.floor(Math.random() * cleanFields.length)])
    } else if (flat.length > 0) {
      results.push(flat[Math.floor(Math.random() * flat.length)])
    } else {
      throw new Error(`Cannot pick field from: ${cleanFields.map(fd => fd.name.value).join(', ')}`)
    }
  }

  return results
}

function getVariableDefinition (name: string, type: TypeNode) : VariableDefinitionNode {
  return {
    kind: Kind.VARIABLE_DEFINITION,
    type: type,
    variable: {
      kind: Kind.VARIABLE,
      name: getName(name)
    }
  }
} 

function getVariable (argName: string, varName: string) : ArgumentNode {
  return {
    kind: Kind.ARGUMENT,
    loc,
    name: getName(argName),
    value: {
      kind: Kind.VARIABLE,
      name: getName(varName)
    }
  }
}

function getArgsAndVars (
  allArgs: ReadonlyArray<InputValueDefinitionNode>,
  nodeName: string,
  fieldName: string,
  config: Configuration,
  schema: GraphQLSchema,
  providedValues: {[varName: string] : any}
) : {
  args: ArgumentNode[],
  variableDefinitionsMap: {[varName: string] : VariableDefinitionNode},
  variableValues: {[varName: string] : any}
} {
  const args : ArgumentNode[] = []
  const variableDefinitionsMap : {[varName: string] : VariableDefinitionNode} = {}
  const variableValues : {[varName: string] : any} = {}
  allArgs
    .filter(arg => considerArgument(arg, config))
    .forEach(arg => {
      const varName = `${nodeName}__${fieldName}__${arg.name.value}`
      args.push(getVariable(arg.name.value, varName))
      variableDefinitionsMap[varName] = getVariableDefinition(varName, arg.type)
      const argType = schema.getType(getTypeName(arg.type))
      variableValues[varName] = provideVaribleValue(
        varName,
        argType,
        config,
        {...variableValues, ...providedValues}
      )
    })
  return { args, variableDefinitionsMap, variableValues }
}
    
function getSelectionSetAndVars(
  schema: GraphQLSchema,
  node: DefinitionNode,
  config: Configuration,
  depth: number = 0
) : {
  selectionSet: SelectionSetNode,
  variableDefinitionsMap: {
    [variableName: string] : VariableDefinitionNode
  },
  variableValues: {
    [variableName: string] : any
  }
 } {
  let selections : SelectionNode[] = []
  let variableDefinitionsMap : {[variableName: string] : VariableDefinitionNode} = {}
  let variableValues : {[variableName: string] : any} = {}

  // abort at leaf nodes:
  if (depth === config.maxDepth) {
    return {
      selectionSet: undefined,
      variableDefinitionsMap,
      variableValues
    }
  }

  if (node.kind === Kind.OBJECT_TYPE_DEFINITION) {
    let fields = getRandomFields(node.fields, config, schema, depth)

    fields.forEach(field => {
      // recurse, if field has children:
      const nextNode = schema.getType(getTypeName(field.type)).astNode
      let selectionSet : SelectionSetNode = undefined
      if (typeof nextNode !== 'undefined') {
        const res = getSelectionSetAndVars(schema, nextNode, config, depth + 1)
        selectionSet = res.selectionSet
        variableDefinitionsMap = {...variableDefinitionsMap, ...res.variableDefinitionsMap}
        variableValues = {...variableValues, ...res.variableValues}
      }

      const avs = getArgsAndVars(
        field.arguments,
        node.name.value,
        field.name.value,
        config,
        schema,
        variableValues
      )
      variableDefinitionsMap = {...variableDefinitionsMap, ...avs.variableDefinitionsMap}
      variableValues = {...variableValues, ...avs.variableValues}

      selections.push({
        kind: Kind.FIELD,
        name: getName(field.name.value),
        selectionSet,
        arguments: avs.args
      })
    })
  }

  return {
    selectionSet: selections.length > 0
      ? {
          kind: Kind.SELECTION_SET,
          selections
        }
      : undefined,
    variableDefinitionsMap,
    variableValues
  }
}

export function generateRandomMutation (
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig = {config, ...DEFAULT_CONFIG}

  // provide default providerMap:
  if (typeof finalConfig.providerMap !== 'object') {
    finalConfig.providerMap = {
      '*__*__*': null
    }
  }

  const {
    mutationDocument,
    variableValues
  } = getMutationOperationDefinition(schema, finalConfig)

  const definitions = [mutationDocument]

  return {
    mutationDocument: getDocumentDefinition(definitions),
    variableValues
  }
}

export function generateRandomQuery (
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig = {...DEFAULT_CONFIG, ...config}

  // provide default providerMap:
  if (typeof finalConfig.providerMap !== 'object') {
    finalConfig.providerMap = {
      '*__*__*': null
    }
  }

  const {
    queryDocument,
    variableValues
  } = getQueryOperationDefinition(schema, finalConfig)

  const definitions = [queryDocument]

  return {
    queryDocument: getDocumentDefinition(definitions),
    variableValues
  }
}
