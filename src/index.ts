import {
  buildSchema,
  OperationDefinitionNode,
  Location,
  DocumentNode,
  SelectionSetNode,
  DefinitionNode,
  GraphQLSchema,
  FieldDefinitionNode,
  SelectionNode,
  FieldNode,
  TypeNode,
  print,
  ArgumentNode,
  NameNode,
  VariableDefinitionNode,
  InputValueDefinitionNode
} from 'graphql'
import * as fs from 'fs'

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
const loc : Location = {start: 0, end: 0, startToken: null, endToken: null, source: null}

function getDocumentDefinition (definitions) : DocumentNode {
  return {
    kind: 'Document',
    definitions,
    loc
  }
}

function getQueryOperationDefinition (
  schema: GraphQLSchema,
  config: Configuration
) : OperationDefinitionNode {
  const node = schema.getQueryType().astNode
  const {selectionSet, variableDefinitions} = getSelectionSetAndVars(schema, node, config)
  
  // throw error if query would be empty:
  if (selectionSet.selections.length === 0) {
    throw new Error(`Could not create query - no selection was possible at the root level`)
  }

  return {
    kind: 'OperationDefinition',
    operation: 'query',
    selectionSet,
    variableDefinitions,
    loc,
    name: getName('RandomQuery')
  }
}

function getMutationOperationDefinition(
  schema: GraphQLSchema,
  config: Configuration
) : OperationDefinitionNode {
  const node = schema.getMutationType().astNode
  const {selectionSet, variableDefinitions} = getSelectionSetAndVars(schema, node, config)
  
  // throw error if mutation would be empty:
  if (selectionSet.selections.length === 0) {
    throw new Error(`Could not create mutation - no selection was possible at the root level`)
  }

  return {
    kind: 'OperationDefinition',
    operation: 'mutation',
    selectionSet,
    variableDefinitions,
    loc,
    name: getName('RandomMutation')
  }
}

function getTypeName (type: TypeNode) : string {
  if (type.kind === 'NamedType') {
    return type.name.value
  } else if (type.kind === 'ListType') {
    return getTypeName(type.type)
  } else if (type.kind === 'NonNullType') {
    return getTypeName(type.type)
  } else {
    throw new Error(`Cannot get name of type: ${type}`)
  }
}

function isMandatory (type: TypeNode) : boolean {
  return type.kind === 'NonNullType'
}

function getName (name: string) : NameNode {
  return {
    kind: 'Name',
    value: name
  }
}

function isNestedField (field: FieldDefinitionNode) : boolean {
  return typeof schema.getType(getTypeName(field.type)).astNode !== 'undefined'
}

function isInterfaceField (field: FieldDefinitionNode, schema: GraphQLSchema) : boolean {
  const ast = schema.getType(getTypeName(field.type)).astNode
  return typeof ast !== 'undefined' && ast.kind === 'InterfaceTypeDefinition'
}

function considerArgument (arg: InputValueDefinitionNode, config: Configuration) : boolean {
  const isArgumentToIgnore = config.argumentsToIgnore.includes(arg.name.value)
  const isArgumentToConsider = config.argumentsToConsider.includes(arg.name.value)
  const isMand = isMandatory(arg.type)
  const isOptional = !isMand

  // checks for consistency:
  if (isMand && isArgumentToIgnore) {
    throw new Error(`Cannot ignore non-null argument "${arg.name.value}"`)
  }

  if (isArgumentToIgnore && isArgumentToConsider) {
    throw new Error(`Cannot ignore AND consider argument "${arg.name.value}"`)
  }

  // return value based on options:
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
  return typeof ast !== 'undefined' && ast.kind === 'UnionTypeDefinition'}

function getRandomFields (
  fields: ReadonlyArray<FieldDefinitionNode>,
  config: Configuration,
  schema: GraphQLSchema,
  depth: number
) : ReadonlyArray<FieldDefinitionNode> {
  // filter Interfaces and Unions (for now):
  const cleanFields = fields
    .filter(field => !isInterfaceField(field, schema))
    .filter(field => !isUnionField(field, schema))

  if (cleanFields.length === 0) {
    return []
  }

  const results = []
  const nested = cleanFields.filter(isNestedField)
  const flat = cleanFields.filter(field => !isNestedField(field))

  // if depth probability is high, definitely chose one nested field:
  if (Math.random() <= config.depthProbability && nested.length > 0 && depth <= config.depthProbability + 1) {
    let nestedIndex = Math.floor(Math.random() * nested.length)
    results.push(nested[nestedIndex])
    nested.splice(nestedIndex, 1)
  }

  // pick further nested fields based on the breadth probability:
  if (depth <= config.depthProbability + 1) {
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
    results.push(cleanFields[Math.floor(Math.random() * cleanFields.length)])
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
        kind: 'Argument',
        loc,
        name: getName(arg.name.value),
        value: {
          kind: 'Variable',
          name: getName(varName)
        }
      })
      vars.push({
        kind: 'VariableDefinition',
        type: arg.type,
        variable: {
          kind: 'Variable',
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
  variableDefinitions: VariableDefinitionNode[]
 } {
  // abort eventually:
  if (depth >= config.maxDepth) {
    return {
      selectionSet: null,
      variableDefinitions: []
    }
  }

  let selections : SelectionNode[] = []
  let variableDefinitions : VariableDefinitionNode[] = []

  if (node.kind === 'ObjectTypeDefinition') {
    let fields = getRandomFields(node.fields, config, schema, depth)

    selections = fields.map((field) : FieldNode => {
      const nextNode = schema.getType(getTypeName(field.type)).astNode
      let selectionSetMap = null
      if (typeof nextNode !== 'undefined') {
        const nextSelectionSet = getSelectionSetAndVars(schema, nextNode, config, depth + 1)
        selectionSetMap = nextSelectionSet.selectionSet
        variableDefinitions = [...variableDefinitions, ...nextSelectionSet.variableDefinitions]
      }

      const argsAndVars = getArgsAndVars(
        field.arguments,
        node.name.value,
        field.name.value,
        config
      )
      variableDefinitions = [...variableDefinitions, ...argsAndVars.vars]

      return {
        kind: 'Field',
        name: getName(field.name.value),
        selectionSet: selectionSetMap,
        arguments: argsAndVars.args
      }
    })
  }

  return {
    selectionSet: {
      kind: 'SelectionSet',
      selections
    },
    variableDefinitions
  }
}

export function buildRandomMutation (
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig = {config, ...DEFAULT_CONFIG}
  const definitions = [getMutationOperationDefinition(schema, finalConfig)]
  return getDocumentDefinition(definitions)
}

export function buildRandomQuery (
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig = {...DEFAULT_CONFIG, ...config}
  console.log(finalConfig)
  const definitions = [getQueryOperationDefinition(schema, finalConfig)]
  return getDocumentDefinition(definitions)
}

// kick things of:
const schemaDef = fs.readFileSync('./src/schema.graphql').toString()
// const schemaDef = fs.readFileSync('./src/github.graphql').toString()
const schema = buildSchema(schemaDef)
const config : Configuration = {
  // breadthProbability: 0.01,
  // depthProbability: 0.09,
  // maxDepth: 2,
  // argumentsToIgnore: [
  //   'before',
  //   'after',
  //   'last'
  // ],
  argumentsToConsider: [
    'first'
  ],
  ignoreOptionalArguments: true
}
// const mutationAst = buildRandomMutation(schema, config)
// console.log(print(mutationAst))
const queryAst = buildRandomQuery(schema, config)
console.log(print(queryAst))
