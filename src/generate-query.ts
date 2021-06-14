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
  InlineFragmentNode,
  GraphQLObjectType,
  print,
  StringValueNode,
  NamedTypeNode,
  DirectiveNode,
  GraphQLNamedType,
  ListValueNode,
  BooleanValueNode
} from 'graphql'

import * as seedrandom from 'seedrandom'

import merge from 'merge'

import {
  ProviderMap,
  getProviderValue,
  isEnumType,
  getRandomEnum,
  getDefaultArgValue
} from './provide-variables'

export type Configuration = {
  depthProbability?: number | ((depth: number) => number)
  breadthProbability?: number | ((depth: number) => number)
  maxDepth?: number
  ignoreOptionalArguments?: boolean
  argumentsToIgnore?: string[]
  argumentsToConsider?: string[]
  providerMap?: ProviderMap
  considerInterfaces?: boolean
  considerUnions?: boolean
  seed?: number
  pickNestedQueryField?: boolean
  providePlaceholders?: boolean
}

export type InternalConfiguration = Configuration & {
  seed: number
  nextSeed?: number
  nodeFactor: number
  typeCount: number
  resolveCount: number
}

const DEFAULT_CONFIG: Configuration = {
  depthProbability: 0.5,
  breadthProbability: 0.5,
  maxDepth: 5,
  ignoreOptionalArguments: true,
  argumentsToIgnore: [],
  argumentsToConsider: [],
  considerInterfaces: false,
  considerUnions: false,
  pickNestedQueryField: false,
  providePlaceholders: false,
  providerMap: {}
}

// Default location
const loc: Location = {
  start: 0,
  end: 0,
  startToken: null,
  endToken: null,
  source: null
}

function getDocumentDefinition(definitions): DocumentNode {
  return {
    kind: Kind.DOCUMENT,
    definitions,
    loc
  }
}

function getTypeNameMetaFieldDef(): FieldDefinitionNode {
  return {
    name: {
      kind: 'Name',
      value: '__typename'
    },
    kind: 'FieldDefinition',
    type: {
      kind: 'NonNullType',
      type: {
        kind: 'NamedType',
        name: {
          kind: 'Name',
          value: 'String'
        }
      }
    }
  }
}

function getQueryOperationDefinition(
  schema: GraphQLSchema,
  config: InternalConfiguration
): {
  queryDocument: OperationDefinitionNode
  variableValues: { [varName: string]: any }
} {
  const node = schema.getQueryType().astNode
  const {
    selectionSet,
    variableDefinitionsMap,
    variableValues
  } = getSelectionSetAndVars(schema, node, config)

  // Throw error if query would be empty
  if (selectionSet.selections.length === 0) {
    throw new Error(
      `Could not create query - no selection was possible at the root level`
    )
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
  config: InternalConfiguration
): {
  mutationDocument: OperationDefinitionNode
  variableValues: { [varName: string]: any }
} {
  const node = schema.getMutationType().astNode
  const {
    selectionSet,
    variableDefinitionsMap,
    variableValues
  } = getSelectionSetAndVars(schema, node, config)

  // Throw error if mutation would be empty
  if (selectionSet.selections.length === 0) {
    throw new Error(
      `Could not create mutation - no selection was possible at the root level`
    )
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

export function getTypeName(type: TypeNode): string {
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

function isMandatoryType(type: TypeNode): boolean {
  return type.kind === Kind.NON_NULL_TYPE
}

function getName(name: string): NameNode {
  return {
    kind: Kind.NAME,
    value: name
  }
}

function isObjectField(
  field: FieldDefinitionNode,
  schema: GraphQLSchema
): boolean {
  const ast = schema.getType(getTypeName(field.type)).astNode
  return typeof ast !== 'undefined' && ast.kind === Kind.OBJECT_TYPE_DEFINITION
}

function isInterfaceField(
  field: FieldDefinitionNode,
  schema: GraphQLSchema
): boolean {
  const ast = schema.getType(getTypeName(field.type)).astNode
  return (
    typeof ast !== 'undefined' && ast.kind === Kind.INTERFACE_TYPE_DEFINITION
  )
}

function isUnionField(
  field: FieldDefinitionNode,
  schema: GraphQLSchema
): boolean {
  const ast = schema.getType(getTypeName(field.type)).astNode
  return typeof ast !== 'undefined' && ast.kind === Kind.UNION_TYPE_DEFINITION
}

export function considerArgument(
  arg: InputValueDefinitionNode,
  config: InternalConfiguration
): boolean {
  const isArgumentToIgnore = config.argumentsToIgnore.includes(arg.name.value)
  const isArgumentToConsider = config.argumentsToConsider.includes(
    arg.name.value
  )
  const isMand = isMandatoryType(arg.type)
  const isOptional = !isMand

  // Check for consistency
  if (isMand && isArgumentToIgnore) {
    throw new Error(`Cannot ignore non-null argument "${arg.name.value}"`)
  }

  if (isArgumentToIgnore && isArgumentToConsider) {
    throw new Error(`Cannot ignore AND consider argument "${arg.name.value}"`)
  }

  // Return value based on options
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

  return true
}

function fieldHasLeafs(
  field: FieldDefinitionNode,
  schema: GraphQLSchema
): boolean {
  const ast = schema.getType(getTypeName(field.type)).astNode
  if (
    ast.kind === Kind.OBJECT_TYPE_DEFINITION ||
    ast.kind === Kind.INTERFACE_TYPE_DEFINITION
  ) {
    return ast.fields.some((child) => {
      const childAst = schema.getType(getTypeName(child.type)).astNode
      return (
        typeof childAst === 'undefined' ||
        childAst.kind === Kind.SCALAR_TYPE_DEFINITION
      )
    })
  } else if (ast.kind === Kind.UNION_TYPE_DEFINITION) {
    return ast.types.some((child) => {
      let unionNamedTypes = (schema.getType(
        child.name.value
      ) as GraphQLObjectType).astNode.fields

      return unionNamedTypes.some((child) => {
        const childAst = schema.getType(getTypeName(child.type)).astNode
        return (
          typeof childAst === 'undefined' ||
          childAst.kind === Kind.SCALAR_TYPE_DEFINITION
        )
      })
    })
  }

  return false
}

function getRandomFields(
  fields: ReadonlyArray<FieldDefinitionNode>,
  config: InternalConfiguration,
  schema: GraphQLSchema,
  depth: number
): ReadonlyArray<FieldDefinitionNode> {
  const results = []

  // Create lists of nested and flat fields to pick from
  let nested
  let flat
  if (config.considerInterfaces && config.considerUnions) {
    nested = fields.filter((field) => {
      return (
        isObjectField(field, schema) ||
        isInterfaceField(field, schema) ||
        isUnionField(field, schema)
      )
    })

    flat = fields.filter((field) => {
      return !(
        isObjectField(field, schema) ||
        isInterfaceField(field, schema) ||
        isUnionField(field, schema)
      )
    })
  } else if (config.considerInterfaces! && config.considerUnions) {
    fields = fields.filter((field) => {
      return !isInterfaceField(field, schema)
    })

    nested = fields.filter((field) => {
      return isObjectField(field, schema) || isUnionField(field, schema)
    })

    flat = fields.filter((field) => {
      return !(isObjectField(field, schema) || isUnionField(field, schema))
    })
  } else if (config.considerInterfaces && config.considerUnions!) {
    fields = fields.filter((field) => {
      return !isUnionField(field, schema)
    })

    nested = fields.filter((field) => {
      return isObjectField(field, schema) || isInterfaceField(field, schema)
    })

    flat = fields.filter((field) => {
      return !(isObjectField(field, schema) || isInterfaceField(field, schema))
    })
  } else {
    fields = fields.filter((field) => {
      return !(isInterfaceField(field, schema) || isUnionField(field, schema))
    })

    nested = fields.filter((field) => {
      return isObjectField(field, schema)
    })

    flat = fields.filter((field) => {
      return !isObjectField(field, schema)
    })
  }

  // Filter out fields that only have nested subfields
  if (depth + 2 === config.maxDepth) {
    nested = nested.filter((field) => fieldHasLeafs(field, schema))
  }
  const nextIsLeaf = depth + 1 === config.maxDepth

  const pickNested =
    typeof config.depthProbability === 'number'
      ? random(config) <= config.depthProbability
      : random(config) <= config.depthProbability(depth)

  // If we decide to pick nested, choose one nested field (if one exists)...
  if (
    (pickNested && nested.length > 0 && !nextIsLeaf) ||
    (depth === 0 && config.pickNestedQueryField)
  ) {
    let nestedIndex = Math.floor(random(config) * nested.length)
    results.push(nested[nestedIndex])
    nested.splice(nestedIndex, 1)

    // ...and possibly choose more
    nested.forEach((field) => {
      const pickNested =
        typeof config.breadthProbability === 'number'
          ? random(config) <= config.breadthProbability
          : random(config) <= config.breadthProbability(depth)
      if (pickNested) {
        results.push(field)
      }
    })
  }

  // Pick flat fields based on the breadth probability
  flat.forEach((field) => {
    const pickFlat =
      typeof config.breadthProbability === 'number'
        ? random(config) <= config.breadthProbability
        : random(config) <= config.breadthProbability(depth)
    if (pickFlat) {
      results.push(field)
    }
  })

  // Ensure to pick at least one field
  if (results.length === 0) {
    // If the next level is not the last, we can choose ANY field
    if (!nextIsLeaf) {
      const forcedIndex = Math.floor(random(config) * fields.length)
      results.push(fields[forcedIndex])
      // ...otherwise, we HAVE TO choose a flat field:
    } else if (flat.length > 0) {
      const forcedFlatIndex = Math.floor(random(config) * flat.length)
      results.push(flat[forcedFlatIndex])
    } else {
      // default to selecting __typename meta field:
      results.push(getTypeNameMetaFieldDef())
    }
  }

  return results
}

function getVariableDefinition(
  name: string,
  type: TypeNode
): VariableDefinitionNode {
  return {
    kind: Kind.VARIABLE_DEFINITION,
    type: type,
    variable: {
      kind: Kind.VARIABLE,
      name: getName(name)
    }
  }
}

function getVariable(argName: string, varName: string): ArgumentNode {
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

function getNextNodefactor(variableValues: { [name: string]: any }): number {
  if (typeof variableValues['first'] === 'number') {
    variableValues['first']
  }
  return 1
}

/**
 * Returns the first slicing argument defined in the field's @listSize
 * directive, if:
 *  - The @listSize directive is indeed present, and defines slicing arguments
 *  - The requiredArguments do not already include any of the defined slicing
 *    arguments
 *  - The @listSize directive doesn't also set requireOneSlicingArgument to
 *    false
 *
 * TODO: add link to specification / documentation of @listSize directive
 */
function getMissingSlicingArg(
  requiredArguments: InputValueDefinitionNode[],
  field: FieldDefinitionNode,
  schema: GraphQLSchema
): InputValueDefinitionNode {
  // Return null if there is no @listSize directive:
  const listSizeDirective = getListSizeDirective(field)
  if (!listSizeDirective) return null

  // Return null if @listSize directive defines no slicing arguments:
  const slicingArgumentsArg = getSlicingArguments(listSizeDirective)
  if (!slicingArgumentsArg) return null

  // Return null if requireOneSlicingArgument is set to false:
  const requireOneSlicingArg = getRequireOneSlicingArgument(listSizeDirective)
  if (
    requireOneSlicingArg &&
    (requireOneSlicingArg.value as BooleanValueNode).value === false // already checked requireOneSlicingArg is a boolean
  )
    return null

  // Return null if a slicing argument is already used:
  const slicingArguments = (slicingArgumentsArg.value as ListValueNode).values // already checked slicingArgumentsArg is a list
    .filter((value) => value.kind === 'StringValue')
    .map((value) => (value as StringValueNode).value)
  const usesSlicingArg = slicingArguments.some((slicingArg) =>
    requiredArguments
      .map((existing) => existing.name.value)
      .includes(slicingArg)
  )
  if (usesSlicingArg) return null

  // Returns the first slicing argument if slicing argument can be split on '.'
  // then we just need to check the first level match
  return field.arguments.find((arg) => {
    return slicingArguments.find((slicingArgument) => {
      const tokenizedPath = slicingArgument.split('.')
      if (tokenizedPath.length < 1) return false

      return arg.name.value === tokenizedPath[0]
    })
  })
}

function getArgsAndVars(
  field: FieldDefinitionNode,
  nodeName: string,
  config: InternalConfiguration,
  schema: GraphQLSchema,
  providedValues: { [varName: string]: any }
): {
  args: ArgumentNode[]
  variableDefinitionsMap: { [varName: string]: VariableDefinitionNode }
  variableValues: { [varName: string]: any }
} {
  const fieldName = field.name.value
  const allArgs = field.arguments
  const args: ArgumentNode[] = []

  const variableDefinitionsMap: {
    [varName: string]: VariableDefinitionNode
  } = {}
  const requiredArguments = allArgs.filter((arg) =>
    considerArgument(arg, config)
  )
  // Check for slicing arguments defined in a @listSize directive that should
  // be present:
  const missingSlicingArg = getMissingSlicingArg(
    requiredArguments,
    field,
    schema
  )
  if (
    missingSlicingArg &&
    !requiredArguments.find((arg) => {
      return arg.name.value === missingSlicingArg.name.value
    })
  ) {
    requiredArguments.push(missingSlicingArg)
  }
  requiredArguments.forEach((arg) => {
    const varName = `${nodeName}__${fieldName}__${arg.name.value}`
    args.push(getVariable(arg.name.value, varName))
    variableDefinitionsMap[varName] = getVariableDefinition(varName, arg.type)
  })

  const variableValues: { [varName: string]: any } = {}

  // First, check for providers based on type__field query
  // (Note: such a provider must return a value which is an object)
  const { providerFound, value } = getProviderValue(
    `${nodeName}__${fieldName}`,
    config,
    providedValues
  )
  if (providerFound && typeof value === 'object') {
    Object.entries(value).forEach(([argName, value]) => {
      const varName = `${nodeName}__${fieldName}__${argName}`
      // Only consider required arguments (provider can provide more than necessary)
      if (Object.keys(variableDefinitionsMap).includes(varName)) {
        variableValues[varName] = value
      }
    })
  }

  // Second, check for providers based on type__field__argument query
  // (Note: they overwrite possibly already provided values)
  requiredArguments.forEach((arg) => {
    const varName = `${nodeName}__${fieldName}__${arg.name.value}`
    const argType = schema.getType(getTypeName(arg.type))
    const { providerFound, value } = getProviderValue(
      varName,
      config,
      { ...variableValues, ...providedValues }, // pass already used variable values
      argType
    )
    if (providerFound) {
      variableValues[varName] = value
    }
  })

  // Third, populate all so-far neglected require variables with defaults or null
  requiredArguments.forEach((arg) => {
    const varName = `${nodeName}__${fieldName}__${arg.name.value}`
    const argType = schema.getType(getTypeName(arg.type))
    if (typeof variableValues[varName] === 'undefined') {
      if (isEnumType(argType)) {
        // Enum values can be randomly selected
        variableValues[varName] = getRandomEnum(argType)
      } else if (config.providePlaceholders) {
        variableValues[varName] = getDefaultArgValue(schema, config, arg.type)

        // Add default values for unfulfilled listSize directive if applicable
        const listSizeDirective = getListSizeDirective(field)
        if (listSizeDirective) {
          const value = getListSizeDirectiveDefaultValue(
            listSizeDirective,
            arg.type,
            config,
            schema
          )

          if (value !== undefined) {
            if (typeof value !== 'object') {
              variableValues[varName] = value
            } else {
              variableValues[varName] = merge.recursive(
                value,
                variableValues[varName]
              )
            }
          }
        }
      } else if (arg.type.kind === 'NonNullType') {
        throw new Error(
          `Missing provider for non-null variable "${varName}" of type "${print(
            arg.type
          )}". ` +
            `Either add a provider (e.g., using a wildcard "*__*" or "*__*__*"), ` +
            `or set providePlaceholders configuration option to true.`
        )
      } else {
        variableValues[varName] = null
      }
    }
  })

  return {
    args,
    variableDefinitionsMap,
    variableValues
  }
}

/**
 * Given a field node, return the listSize directive, if it exists
 */
function getListSizeDirective(field: FieldDefinitionNode): DirectiveNode {
  return field?.directives.find((dir) => dir.name.value === 'listSize')
}

/**
 * Given a listSize directive, get the slicingArguments argument
 */
function getSlicingArguments(listSizeDirective: DirectiveNode): ArgumentNode {
  if (!listSizeDirective) return undefined

  const slicingArgumentsArg = listSizeDirective.arguments.find(
    (arg) => arg.name.value === 'slicingArguments'
  )

  if (!slicingArgumentsArg || slicingArgumentsArg.value.kind !== 'ListValue')
    return undefined

  return slicingArgumentsArg
}

/**
 * Given a listSize directive, get the requireOneSlicingArgument argument
 */
function getRequireOneSlicingArgument(
  listSizeDirective: DirectiveNode
): ArgumentNode {
  if (!listSizeDirective) return undefined

  const requireOneSlicingArg = listSizeDirective.arguments.find(
    (arg) => arg.name.value === 'requireOneSlicingArgument'
  )

  if (
    !requireOneSlicingArg ||
    requireOneSlicingArg.value.kind !== 'BooleanValue'
  )
    return undefined

  return requireOneSlicingArg
}

/**
 * For a given listSize directive, return a default value for it
 */
function getListSizeDirectiveDefaultValue(
  listSizeDirective: DirectiveNode,
  typeNode: TypeNode,
  config: InternalConfiguration,
  schema: GraphQLSchema
) {
  // if requiredOneSlicingArg is false then we do not add anything because none of the slicingArguments are required
  const requireOneSlicingArg = getRequireOneSlicingArgument(listSizeDirective)
  if (
    requireOneSlicingArg &&
    (requireOneSlicingArg.value as BooleanValueNode).value === false
  ) {
    return undefined
  }

  const slicingArgumentsArg = getSlicingArguments(listSizeDirective)
  if (!slicingArgumentsArg) return undefined

  /**
   * Already checked slicingArgumentsArguments is a list
   *
   * Extract paths from slicingArgumentsArguments
   */
  const slicingArgumentsPaths = (slicingArgumentsArg.value as ListValueNode).values.map(
    (value) => {
      if (value.kind === 'StringValue') return value.value
    }
  )

  if (slicingArgumentsPaths.length > 0) {
    const slicingArgumentsTokenizedPath = slicingArgumentsPaths[0].split('.')
    return getListSizeDirectiveDefaultValueHelper(
      slicingArgumentsTokenizedPath,
      typeNode,
      config,
      schema
    )
  }
}

function getListSizeDirectiveDefaultValueHelper(
  tokenizedPath: string[],
  typeNode: TypeNode,
  config: InternalConfiguration,
  schema: GraphQLSchema
) {
  if (tokenizedPath.length === 0) {
    return undefined
  }

  if (tokenizedPath.length === 1) {
    return getDefaultArgValue(schema, config, typeNode)
  }

  const result = {}

  const namedType = unwrapType(typeNode)
  if (namedType.kind === 'NamedType') {
    const type = schema.getType(namedType.name.value)
    if (type.astNode?.kind === 'InputObjectTypeDefinition') {
      const nextType = type.astNode.fields.find((field) => {
        return field.name.value === tokenizedPath[1]
      })

      const value = getListSizeDirectiveDefaultValueHelper(
        tokenizedPath.slice(1),
        nextType.type,
        config,
        schema
      )

      // Add value depending if it is a list or not
      if (!isListType(typeNode)) {
        result[tokenizedPath[1]] = value
      } else {
        result[tokenizedPath[1]] = [value]
      }
    }
  }

  return result
}

/**
 * Given a type node, return the named type node
 */
function unwrapType(type: TypeNode): NamedTypeNode {
  if (type.kind === 'ListType' || type.kind === 'NonNullType') {
    return unwrapType(type.type)
  } else {
    return type
  }
}

/**
 * Given a type node, determine if it is some kind of list node, whether it be
 * non-null list or nested list, or any combination of which
 */
function isListType(type: TypeNode): boolean {
  if (type.kind === 'NamedType') {
    return false
  } else {
    if (type.kind === 'ListType') {
      return true
    } else {
      return isListType(type.type)
    }
  }
}

function getSelectionSetAndVars(
  schema: GraphQLSchema,
  node: DefinitionNode,
  config: InternalConfiguration,
  depth: number = 0
): {
  selectionSet: SelectionSetNode
  variableDefinitionsMap: {
    [variableName: string]: VariableDefinitionNode
  }
  variableValues: {
    [variableName: string]: any
  }
} {
  let selections: SelectionNode[] = []
  let variableDefinitionsMap: {
    [variableName: string]: VariableDefinitionNode
  } = {}
  let variableValues: { [variableName: string]: any } = {}

  // Abort at leaf nodes:
  if (depth === config.maxDepth) {
    return {
      selectionSet: undefined,
      variableDefinitionsMap,
      variableValues
    }
  }

  if (node.kind === Kind.OBJECT_TYPE_DEFINITION) {
    let fields = getRandomFields(node.fields, config, schema, depth)

    fields.forEach((field) => {
      // Recurse, if field has children:
      const nextNode = schema.getType(getTypeName(field.type)).astNode
      let selectionSet: SelectionSetNode = undefined
      if (typeof nextNode !== 'undefined') {
        const res = getSelectionSetAndVars(schema, nextNode, config, depth + 1)

        // Update counts and nodeFactor:
        config.resolveCount += config.nodeFactor
        config.nodeFactor *= getNextNodefactor(res.variableValues)
        config.typeCount += config.nodeFactor

        selectionSet = res.selectionSet
        variableDefinitionsMap = {
          ...variableDefinitionsMap,
          ...res.variableDefinitionsMap
        }
        variableValues = { ...variableValues, ...res.variableValues }
      }

      const avs = getArgsAndVars(
        field,
        node.name.value,
        config,
        schema,
        variableValues
      )
      variableDefinitionsMap = {
        ...variableDefinitionsMap,
        ...avs.variableDefinitionsMap
      }
      variableValues = { ...variableValues, ...avs.variableValues }

      selections.push({
        kind: Kind.FIELD,
        name: getName(field.name.value),
        selectionSet,
        arguments: avs.args
      })
    })
  } else if (node.kind === Kind.INTERFACE_TYPE_DEFINITION) {
    let fields = getRandomFields(node.fields, config, schema, depth)

    fields.forEach((field) => {
      // Recurse, if field has children:
      const nextNode = schema.getType(getTypeName(field.type)).astNode
      let selectionSet: SelectionSetNode = undefined
      if (typeof nextNode !== 'undefined') {
        const res = getSelectionSetAndVars(schema, nextNode, config, depth + 1)

        // Update counts and nodeFactor:
        config.resolveCount += config.nodeFactor
        config.nodeFactor *= getNextNodefactor(res.variableValues)
        config.typeCount += config.nodeFactor

        selectionSet = res.selectionSet
        variableDefinitionsMap = {
          ...variableDefinitionsMap,
          ...res.variableDefinitionsMap
        }
        variableValues = { ...variableValues, ...res.variableValues }
      }

      const avs = getArgsAndVars(
        field,
        node.name.value,
        config,
        schema,
        variableValues
      )
      variableDefinitionsMap = {
        ...variableDefinitionsMap,
        ...avs.variableDefinitionsMap
      }
      variableValues = { ...variableValues, ...avs.variableValues }

      selections.push({
        kind: Kind.FIELD,
        name: getName(field.name.value),
        selectionSet,
        arguments: avs.args
      })
    })

    // Get all objects that implement an interface
    let objectsImplementingInterface = Object.values(
      schema.getTypeMap()
    ).filter((namedType) => {
      if (
        namedType.astNode &&
        namedType.astNode.kind === 'ObjectTypeDefinition'
      ) {
        let interfaceNames = namedType.astNode.interfaces.map(
          (interfaceNamedType) => {
            return interfaceNamedType.name.value
          }
        )

        if (interfaceNames.includes(node.name.value)) {
          return true
        }
      }

      return false
    })

    // Randomly select named types from the union
    let pickObjectsImplementingInterface = objectsImplementingInterface.filter(
      () => {
        if (typeof config.breadthProbability === 'number') {
          return random(config) <= config.breadthProbability
        } else {
          return random(config) <= config.breadthProbability(depth)
        }
      }
    )

    // If no named types are selected, select any one
    if (pickObjectsImplementingInterface.length === 0) {
      const forcedCleanIndex = Math.floor(
        random(config) * objectsImplementingInterface.length
      )
      pickObjectsImplementingInterface.push(
        objectsImplementingInterface[forcedCleanIndex]
      )
    }

    pickObjectsImplementingInterface.forEach((namedType) => {
      if (namedType.astNode) {
        let type = namedType.astNode

        // Unions can only contain objects
        if (type.kind === Kind.OBJECT_TYPE_DEFINITION) {
          // Get selections
          let selectionSet: SelectionSetNode = undefined
          const res = getSelectionSetAndVars(schema, type, config, depth)
          selectionSet = res.selectionSet
          variableDefinitionsMap = {
            ...variableDefinitionsMap,
            ...res.variableDefinitionsMap
          }
          variableValues = { ...variableValues, ...res.variableValues }

          let fragment: InlineFragmentNode = {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: type.name.value
              }
            },
            selectionSet: selectionSet
          }

          selections.push(fragment)
        } else {
          throw Error(
            `There should only be object types ` +
              `in the selectionSet but found: ` +
              `"${JSON.stringify(type, null, 2)}"`
          )
        }
      } else {
        selections.push({
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: namedType.name
          }
        })
      }
    })
  } else if (node.kind === Kind.UNION_TYPE_DEFINITION) {
    // Get the named types in the union
    let unionNamedTypes = node.types.map((namedTypeNode) => {
      return schema.getType(namedTypeNode.name.value)
    })

    // Randomly select named types from the union
    let pickUnionNamedTypes = unionNamedTypes.filter(() => {
      if (typeof config.breadthProbability === 'number') {
        return random(config) <= config.breadthProbability
      } else {
        return random(config) <= config.breadthProbability(depth)
      }
    })

    // If no named types are selected, select any one
    if (pickUnionNamedTypes.length === 0) {
      const forcedCleanIndex = Math.floor(
        random(config) * unionNamedTypes.length
      )
      pickUnionNamedTypes.push(unionNamedTypes[forcedCleanIndex])
    }

    pickUnionNamedTypes.forEach((namedType) => {
      if (namedType.astNode) {
        let type = namedType.astNode

        // Unions can only contain objects
        if (type.kind === Kind.OBJECT_TYPE_DEFINITION) {
          // Get selections
          let selectionSet: SelectionSetNode = undefined
          const res = getSelectionSetAndVars(schema, type, config, depth)
          selectionSet = res.selectionSet
          variableDefinitionsMap = {
            ...variableDefinitionsMap,
            ...res.variableDefinitionsMap
          }
          variableValues = { ...variableValues, ...res.variableValues }

          let fragment: InlineFragmentNode = {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: type.name.value
              }
            },
            selectionSet: selectionSet
          }

          selections.push(fragment)
        } else {
          throw Error(
            `There should only be object types ` +
              `in the selectionSet but found: ` +
              `"${JSON.stringify(type, null, 2)}"`
          )
        }
      } else {
        selections.push({
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: namedType.name
          }
        })
      }
    })
  }

  let aliasIndexes: { [fieldName: string]: number } = {}
  let cleanselections: SelectionNode[] = []

  // Ensure unique field names/aliases
  selections.forEach((selectionNode) => {
    if (selectionNode.kind === Kind.FIELD) {
      let fieldName = selectionNode.name.value
      if (fieldName in aliasIndexes) {
        cleanselections.push({
          ...selectionNode,
          ...{
            alias: {
              kind: Kind.NAME,
              value: `${fieldName}${aliasIndexes[fieldName]++}`
            }
          }
        })
      } else {
        aliasIndexes[fieldName] = 2
        cleanselections.push(selectionNode)
      }
    } else if (selectionNode.kind === Kind.INLINE_FRAGMENT) {
      let cleanFragmentSelections: SelectionNode[] = []
      selectionNode.selectionSet.selections.forEach((fragmentSelectionNode) => {
        if (fragmentSelectionNode.kind === Kind.FIELD) {
          let fieldName = fragmentSelectionNode.name.value
          if (fieldName in aliasIndexes) {
            cleanFragmentSelections.push({
              ...fragmentSelectionNode,
              ...{
                alias: {
                  kind: Kind.NAME,
                  value: `${fieldName}${aliasIndexes[fieldName]++}`
                }
              }
            })
          } else {
            aliasIndexes[fieldName] = 2
            cleanFragmentSelections.push(fragmentSelectionNode)
          }
        }
      })

      selectionNode.selectionSet.selections = cleanFragmentSelections
      cleanselections.push(selectionNode)
    } else {
      throw Error(
        `There should not be any fragment spreads in the selectionNode "${JSON.stringify(
          selectionNode,
          null,
          2
        )}"`
      )
    }
  })

  return {
    selectionSet:
      cleanselections.length > 0
        ? {
            kind: Kind.SELECTION_SET,
            selections: cleanselections
          }
        : undefined,
    variableDefinitionsMap,
    variableValues
  }
}

export function generateRandomMutation(
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig: InternalConfiguration = {
    ...DEFAULT_CONFIG,
    ...config,
    seed: typeof config.seed !== 'undefined' ? config.seed : Math.random(),
    nodeFactor: 1,
    typeCount: 0,
    resolveCount: 0
  }

  const { mutationDocument, variableValues } = getMutationOperationDefinition(
    schema,
    finalConfig
  )

  const definitions = [mutationDocument]

  return {
    mutationDocument: getDocumentDefinition(definitions),
    variableValues,
    seed: finalConfig.seed,
    typeCount: finalConfig.typeCount,
    resolveCount: finalConfig.resolveCount
  }
}

export function generateRandomQuery(
  schema: GraphQLSchema,
  config: Configuration = {}
) {
  const finalConfig: InternalConfiguration = {
    ...DEFAULT_CONFIG,
    ...config,
    seed: typeof config.seed !== 'undefined' ? config.seed : Math.random(),
    nodeFactor: 1,
    typeCount: 0,
    resolveCount: 0
  }

  const { queryDocument, variableValues } = getQueryOperationDefinition(
    schema,
    finalConfig
  )

  const definitions = [queryDocument]

  return {
    queryDocument: getDocumentDefinition(definitions),
    variableValues,
    seed: finalConfig.seed,
    typeCount: finalConfig.typeCount,
    resolveCount: finalConfig.resolveCount
  }
}

function random(config: InternalConfiguration) {
  if (typeof config.nextSeed !== 'undefined') {
    config.nextSeed = seedrandom(config.nextSeed)()
    return config.nextSeed
  } else {
    config.nextSeed = seedrandom(config.seed)()
    return config.nextSeed
  }
}
