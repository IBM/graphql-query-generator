import {
  buildSchema,
  parse,
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
import { requiredSubselectionMessage } from 'graphql/validation/rules/ScalarLeafs';
type Configuration = {
  depthProbability: number,
  breadthProbability: number,
  maxDepth: number,
  argumentsToIgnore?: string[]
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

function getQueryOperationDefinition (schema: GraphQLSchema, config: Configuration) : OperationDefinitionNode {
  const node = schema.getQueryType().astNode
  const {selectionSet, variableDefinitions} = getSelectionSet(schema, node, config)
  
  // throw error if query would be empty:
  if (selectionSet.selections.length === 0) {
    throw new Error(`Could not create query - no selection was possible at the root level`)
  }

  return {
    kind: 'OperationDefinition',
    operation: 'query',
    selectionSet,
    variableDefinitions,
    loc
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
  if (!Array.isArray(config.argumentsToIgnore) || config.argumentsToIgnore.length === 0) {
    return true
  }
  return !config.argumentsToIgnore.includes(arg.name.value)
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

function getSelectionSet(
  schema: GraphQLSchema,
  node: DefinitionNode,
  config: Configuration,
  depth: number = 0
) : {
  selectionSet: SelectionSetNode,
  variableDefinitions: VariableDefinitionNode[]
 } {
  let selections : SelectionNode[] = []
  let variableDefinitions : VariableDefinitionNode[] = []

  // abort eventually:
  if (depth >= config.maxDepth) {
    return {
      selectionSet: null,
      variableDefinitions
    }
  }

  if (node.kind === 'ObjectTypeDefinition') {
    let fields = getRandomFields(node.fields, config, schema, depth)

    selections = fields.map((field) : FieldNode => {
      const nextNode = schema.getType(getTypeName(field.type)).astNode
      let selectionSetMap = null
      if (typeof nextNode !== 'undefined') {
        const nextSelectionSet = getSelectionSet(schema, nextNode, config, depth + 1)
        selectionSetMap = nextSelectionSet.selectionSet
        variableDefinitions = [...variableDefinitions, ...nextSelectionSet.variableDefinitions]
      }
      const argumentsList : ArgumentNode[] = []
      field.arguments
        .filter(arg => considerArgument(arg, config))
        .forEach((arg) => {
        const varName = `${node.name.value}__${field.name.value}__${arg.name.value}`
        argumentsList.push({
          kind: 'Argument',
          loc,
          name: getName(arg.name.value),
          value: {
            kind: 'Variable',
            name: getName(varName)
          }
        })
        variableDefinitions.push({
          kind: 'VariableDefinition',
          type: arg.type,
          variable: {
            kind: 'Variable',
            name: getName(varName)
          }
        })
      })
      return {
        kind: 'Field',
        name: getName(field.name.value),
        selectionSet: selectionSetMap,
        arguments: argumentsList
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

function buildQuery (schema: GraphQLSchema, config: Configuration) {
  const definitions = [getQueryOperationDefinition(schema, config)]
  const document = getDocumentDefinition(definitions)

  console.log(print(document))
}

// kick things of:
// const schemaDef = fs.readFileSync('./src/schema.graphql').toString()
const schemaDef = fs.readFileSync('./src/github.graphql').toString()
const schema = buildSchema(schemaDef)
const config : Configuration = {
  breadthProbability: 0.2,
  depthProbability: 0.2,
  maxDepth: 2,
  argumentsToIgnore: [
    'before',
    'after',
    'last'
  ]
}
buildQuery(schema, config)
