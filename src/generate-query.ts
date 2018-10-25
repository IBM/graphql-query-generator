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
  Kind
} from 'graphql'

export type Configuration = {
  depthProbability?: number,
  breadthProbability?: number,
  maxDepth?: number,
  ignoreOptionalArguments?: boolean,
  argumentsToIgnore?: string[],
  argumentsToConsider?: string[]
}

const DEFAULT_CONFIG : Configuration = {
  depthProbability: 0.5,
  breadthProbability: 0.5,
  maxDepth: 5,
  ignoreOptionalArguments: true,
  argumentsToIgnore: [],
  argumentsToConsider: []
}

// default loc: {start: 0, end: 0}
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
) : OperationDefinitionNode {
  const node = schema.getQueryType().astNode
  const {selectionSet, variableDefinitionsMap} = getSelectionSetAndVars(schema, node, config)
  
  // throw error if query would be empty:
  if (selectionSet.selections.length === 0) {
    throw new Error(`Could not create query - no selection was possible at the root level`)
  }

  return {
    kind: Kind.OPERATION_DEFINITION,
    operation: 'query',
    selectionSet,
    variableDefinitions: Object.values(variableDefinitionsMap),
    loc,
    name: getName('RandomQuery')
  }
}

function getMutationOperationDefinition(
  schema: GraphQLSchema,
  config: Configuration
) : OperationDefinitionNode {
  const node = schema.getMutationType().astNode
  const {selectionSet, variableDefinitionsMap} = getSelectionSetAndVars(schema, node, config)
  
  // throw error if mutation would be empty:
  if (selectionSet.selections.length === 0) {
    throw new Error(`Could not create mutation - no selection was possible at the root level`)
  }

  return {
    kind: Kind.OPERATION_DEFINITION,
    operation: 'mutation',
    selectionSet,
    variableDefinitions: Object.values(variableDefinitionsMap),
    loc,
    name: getName('RandomMutation')
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
      throw new Error(`Cannot pick field from: ${cleanFields.join(', ')}`)
    }
  }

  return results
}

function getArgsAndVars (
  allArgs: ReadonlyArray<InputValueDefinitionNode>,
  nodeName: string,
  fieldName: string,
  config: Configuration
) : {
  args: ArgumentNode[],
  vars: VariableDefinitionNode[]
} {
  const args : ArgumentNode[] = []
  const vars : VariableDefinitionNode[] =[]
  allArgs
    .filter(arg => considerArgument(arg, config))
    .forEach(arg => {
      const varName = `${nodeName}__${fieldName}__${arg.name.value}`
      args.push({
        kind: Kind.ARGUMENT,
        loc,
        name: getName(arg.name.value),
        value: {
          kind: Kind.VARIABLE,
          name: getName(varName)
        }
      })
      vars.push({
        kind: Kind.VARIABLE_DEFINITION,
        type: arg.type,
        variable: {
          kind: Kind.VARIABLE,
          name: getName(varName)
        }
      })
    })
  return { args, vars }
}

function getSelectionSetAndVars(
  schema: GraphQLSchema,
  node: DefinitionNode,
  config: Configuration,
  depth: number = 0
) : {
  selectionSet: SelectionSetNode,
  variableDefinitionsMap: {
    [key: string] : VariableDefinitionNode
  }
 } {
  // abort at leaf nodes:
  if (depth === config.maxDepth) {
    return {
      selectionSet: undefined,
      variableDefinitionsMap: {}
    }
  }

  let selections : SelectionNode[] = []
  let variableDefinitionsMap : {[key: string] : VariableDefinitionNode} = {}

  if (node.kind === Kind.OBJECT_TYPE_DEFINITION) {
    let fields = getRandomFields(node.fields, config, schema, depth)

    fields.forEach(field => {
      const nextNode = schema.getType(getTypeName(field.type)).astNode
      let selectionSetMap : SelectionSetNode = null
      if (typeof nextNode !== 'undefined') {
        const nextSelectionSet = getSelectionSetAndVars(schema, nextNode, config, depth + 1)
        selectionSetMap = nextSelectionSet.selectionSet
        variableDefinitionsMap = {...variableDefinitionsMap, ...nextSelectionSet.variableDefinitionsMap}
      }

      const argsAndVars = getArgsAndVars(
        field.arguments,
        node.name.value,
        field.name.value,
        config
      )
      argsAndVars.vars.forEach(varDef => {
        variableDefinitionsMap[varDef.variable.name.value] = varDef
      })

      const selectionSet = selectionSetMap && selectionSetMap.selections.length > 0
        ? selectionSetMap
        : undefined
      selections.push({
        kind: Kind.FIELD,
        name: getName(field.name.value),
        selectionSet,
        arguments: argsAndVars.args
      })
    })
  }

  return {
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections
    },
    variableDefinitionsMap
  }
}

export function generateRandomMutation (
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig = {config, ...DEFAULT_CONFIG}
  const definitions = [getMutationOperationDefinition(schema, finalConfig)]
  return getDocumentDefinition(definitions)
}

export function generateRandomQuery (
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig = {...DEFAULT_CONFIG, ...config}
  const definitions = [getQueryOperationDefinition(schema, finalConfig)]
  return getDocumentDefinition(definitions)
}
