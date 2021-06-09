"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const seedrandom = require("seedrandom");
const provide_variables_1 = require("./provide-variables");
const DEFAULT_CONFIG = {
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
};
// Default location
const loc = {
    start: 0,
    end: 0,
    startToken: null,
    endToken: null,
    source: null
};
function getDocumentDefinition(definitions) {
    return {
        kind: graphql_1.Kind.DOCUMENT,
        definitions,
        loc
    };
}
function getTypeNameMetaFieldDef() {
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
    };
}
function getQueryOperationDefinition(schema, config) {
    const node = schema.getQueryType().astNode;
    const { selectionSet, variableDefinitionsMap, variableValues } = getSelectionSetAndVars(schema, node, config);
    // Throw error if query would be empty
    if (selectionSet.selections.length === 0) {
        throw new Error(`Could not create query - no selection was possible at the root level`);
    }
    return {
        queryDocument: {
            kind: graphql_1.Kind.OPERATION_DEFINITION,
            operation: 'query',
            selectionSet,
            variableDefinitions: Object.values(variableDefinitionsMap),
            loc,
            name: getName('RandomQuery')
        },
        variableValues
    };
}
function getMutationOperationDefinition(schema, config) {
    const node = schema.getMutationType().astNode;
    const { selectionSet, variableDefinitionsMap, variableValues } = getSelectionSetAndVars(schema, node, config);
    // Throw error if mutation would be empty
    if (selectionSet.selections.length === 0) {
        throw new Error(`Could not create mutation - no selection was possible at the root level`);
    }
    return {
        mutationDocument: {
            kind: graphql_1.Kind.OPERATION_DEFINITION,
            operation: 'mutation',
            selectionSet,
            variableDefinitions: Object.values(variableDefinitionsMap),
            loc,
            name: getName('RandomMutation')
        },
        variableValues
    };
}
function getTypeName(type) {
    if (type.kind === graphql_1.Kind.NAMED_TYPE) {
        return type.name.value;
    }
    else if (type.kind === graphql_1.Kind.LIST_TYPE) {
        return getTypeName(type.type);
    }
    else if (type.kind === graphql_1.Kind.NON_NULL_TYPE) {
        return getTypeName(type.type);
    }
    else {
        throw new Error(`Cannot get name of type: ${type}`);
    }
}
exports.getTypeName = getTypeName;
function isMandatoryType(type) {
    return type.kind === graphql_1.Kind.NON_NULL_TYPE;
}
function getName(name) {
    return {
        kind: graphql_1.Kind.NAME,
        value: name
    };
}
function isObjectField(field, schema) {
    const ast = schema.getType(getTypeName(field.type)).astNode;
    return typeof ast !== 'undefined' && ast.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION;
}
function isInterfaceField(field, schema) {
    const ast = schema.getType(getTypeName(field.type)).astNode;
    return (typeof ast !== 'undefined' && ast.kind === graphql_1.Kind.INTERFACE_TYPE_DEFINITION);
}
function isUnionField(field, schema) {
    const ast = schema.getType(getTypeName(field.type)).astNode;
    return typeof ast !== 'undefined' && ast.kind === graphql_1.Kind.UNION_TYPE_DEFINITION;
}
function considerArgument(arg, config) {
    const isArgumentToIgnore = config.argumentsToIgnore.includes(arg.name.value);
    const isArgumentToConsider = config.argumentsToConsider.includes(arg.name.value);
    const isMand = isMandatoryType(arg.type);
    const isOptional = !isMand;
    // Check for consistency
    if (isMand && isArgumentToIgnore) {
        throw new Error(`Cannot ignore non-null argument "${arg.name.value}"`);
    }
    if (isArgumentToIgnore && isArgumentToConsider) {
        throw new Error(`Cannot ignore AND consider argument "${arg.name.value}"`);
    }
    // Return value based on options
    if (isMand) {
        return true;
    }
    if (isArgumentToConsider) {
        return true;
    }
    if (isArgumentToIgnore) {
        return false;
    }
    if (isOptional && config.ignoreOptionalArguments) {
        return false;
    }
    return true;
}
exports.considerArgument = considerArgument;
function fieldHasLeafs(field, schema) {
    const ast = schema.getType(getTypeName(field.type)).astNode;
    if (ast.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION ||
        ast.kind === graphql_1.Kind.INTERFACE_TYPE_DEFINITION) {
        return ast.fields.some((child) => {
            const childAst = schema.getType(getTypeName(child.type)).astNode;
            return (typeof childAst === 'undefined' ||
                childAst.kind === graphql_1.Kind.SCALAR_TYPE_DEFINITION);
        });
    }
    else if (ast.kind === graphql_1.Kind.UNION_TYPE_DEFINITION) {
        return ast.types.some((child) => {
            let unionNamedTypes = schema.getType(child.name.value).astNode.fields;
            return unionNamedTypes.some((child) => {
                const childAst = schema.getType(getTypeName(child.type)).astNode;
                return (typeof childAst === 'undefined' ||
                    childAst.kind === graphql_1.Kind.SCALAR_TYPE_DEFINITION);
            });
        });
    }
    return false;
}
function getRandomFields(fields, config, schema, depth) {
    const results = [];
    // Create lists of nested and flat fields to pick from
    let nested;
    let flat;
    if (config.considerInterfaces && config.considerUnions) {
        nested = fields.filter((field) => {
            return (isObjectField(field, schema) ||
                isInterfaceField(field, schema) ||
                isUnionField(field, schema));
        });
        flat = fields.filter((field) => {
            return !(isObjectField(field, schema) ||
                isInterfaceField(field, schema) ||
                isUnionField(field, schema));
        });
    }
    else if (config.considerInterfaces && config.considerUnions) {
        fields = fields.filter((field) => {
            return !isInterfaceField(field, schema);
        });
        nested = fields.filter((field) => {
            return isObjectField(field, schema) || isUnionField(field, schema);
        });
        flat = fields.filter((field) => {
            return !(isObjectField(field, schema) || isUnionField(field, schema));
        });
    }
    else if (config.considerInterfaces && config.considerUnions) {
        fields = fields.filter((field) => {
            return !isUnionField(field, schema);
        });
        nested = fields.filter((field) => {
            return isObjectField(field, schema) || isInterfaceField(field, schema);
        });
        flat = fields.filter((field) => {
            return !(isObjectField(field, schema) || isInterfaceField(field, schema));
        });
    }
    else {
        fields = fields.filter((field) => {
            return !(isInterfaceField(field, schema) || isUnionField(field, schema));
        });
        nested = fields.filter((field) => {
            return isObjectField(field, schema);
        });
        flat = fields.filter((field) => {
            return !isObjectField(field, schema);
        });
    }
    // Filter out fields that only have nested subfields
    if (depth + 2 === config.maxDepth) {
        nested = nested.filter((field) => fieldHasLeafs(field, schema));
    }
    const nextIsLeaf = depth + 1 === config.maxDepth;
    const pickNested = typeof config.depthProbability === 'number'
        ? random(config) <= config.depthProbability
        : random(config) <= config.depthProbability(depth);
    // If we decide to pick nested, choose one nested field (if one exists)...
    if ((pickNested && nested.length > 0 && !nextIsLeaf) ||
        (depth === 0 && config.pickNestedQueryField)) {
        let nestedIndex = Math.floor(random(config) * nested.length);
        results.push(nested[nestedIndex]);
        nested.splice(nestedIndex, 1);
        // ...and possibly choose more
        nested.forEach((field) => {
            const pickNested = typeof config.breadthProbability === 'number'
                ? random(config) <= config.breadthProbability
                : random(config) <= config.breadthProbability(depth);
            if (pickNested) {
                results.push(field);
            }
        });
    }
    // Pick flat fields based on the breadth probability
    flat.forEach((field) => {
        const pickFlat = typeof config.breadthProbability === 'number'
            ? random(config) <= config.breadthProbability
            : random(config) <= config.breadthProbability(depth);
        if (pickFlat) {
            results.push(field);
        }
    });
    // Ensure to pick at least one field
    if (results.length === 0) {
        // If the next level is not the last, we can choose ANY field
        if (!nextIsLeaf) {
            const forcedIndex = Math.floor(random(config) * fields.length);
            results.push(fields[forcedIndex]);
            // ...otherwise, we HAVE TO choose a flat field:
        }
        else if (flat.length > 0) {
            const forcedFlatIndex = Math.floor(random(config) * flat.length);
            results.push(flat[forcedFlatIndex]);
        }
        else {
            // default to selecting __typename meta field:
            results.push(getTypeNameMetaFieldDef());
        }
    }
    return results;
}
function getVariableDefinition(name, type) {
    return {
        kind: graphql_1.Kind.VARIABLE_DEFINITION,
        type: type,
        variable: {
            kind: graphql_1.Kind.VARIABLE,
            name: getName(name)
        }
    };
}
function getVariable(argName, varName) {
    return {
        kind: graphql_1.Kind.ARGUMENT,
        loc,
        name: getName(argName),
        value: {
            kind: graphql_1.Kind.VARIABLE,
            name: getName(varName)
        }
    };
}
function getNextNodefactor(variableValues) {
    if (typeof variableValues['first'] === 'number') {
        variableValues['first'];
    }
    return 1;
}
/**
 * Returns the first slicing argument defined in the field's @listSize
 * directive, if:
 *  - The @listSize directive is indeed present, and defines slicing arguments
 *  - The requiredArguments do not already include any of the defined slicing
 *    arguments
 *  - The @listSize diretcive doesn't also set requireOneSlicingArgument to
 *    false
 *
 * TODO: add link to specification / documentation of @listSize directive
 */
function getMissingSlicingArg(requiredArguments, field, schema) {
    // Return null if there is no @listSize directive:
    const listSizeDirective = field.directives.find((dir) => dir.name.value === 'listSize');
    if (typeof listSizeDirective === 'undefined')
        return null;
    // Return null if @listSize directive defines no slicing arguments:
    const slicingArgumentsArg = listSizeDirective.arguments.find((arg) => arg.name.value === 'slicingArguments');
    if (typeof slicingArgumentsArg === 'undefined' ||
        slicingArgumentsArg.value.kind !== 'ListValue')
        return null;
    // Return null if requireOneSlicingArgument is set to false:
    const requireOneSlicingArg = listSizeDirective.arguments.find((arg) => arg.name.value === 'requireOneSlicingArgument');
    if (typeof requireOneSlicingArg !== 'undefined' &&
        requireOneSlicingArg.value.kind === 'BooleanValue' &&
        requireOneSlicingArg.value.value === false)
        return null;
    // Return null if a slicing argument is already used:
    const slicingArguments = slicingArgumentsArg.value.values
        .filter((value) => value.kind === 'StringValue')
        .map((value) => value.value);
    const usesSlicingArg = slicingArguments.some((slicingArg) => requiredArguments
        .map((existing) => existing.name.value)
        .includes(slicingArg));
    if (usesSlicingArg)
        return null;
    // Return the first slicing arguments:
    return field.arguments.find((arg) => {
        return slicingArguments.find((slicingArgument) => {
            let result = [];
            let candidates = [arg];
            let slicingArgumentTokens = slicingArgument.split(".");
            for (let i = 0; i < slicingArgumentTokens.length; i++) {
                let slicingArgumentToken = slicingArgumentTokens[i];
                for (let j = 0; j < candidates.length; j++) {
                    let candidate = candidates[j];
                    if (slicingArgumentToken === candidate.name.value) {
                        if (candidate.kind === graphql_1.Kind.INPUT_VALUE_DEFINITION &&
                            candidate.type.kind === graphql_1.Kind.NAMED_TYPE) {
                            let type = schema.getType(candidate.type.name.value);
                            if (type.astNode.kind === graphql_1.Kind.INPUT_OBJECT_TYPE_DEFINITION) {
                                //candidates = type.astNode.fields.map((field)=>{return field}) // TODO use this
                                return type.astNode.fields.find((field) => {
                                    return field.name.value === slicingArgumentTokens[i + 1];
                                });
                            }
                        }
                    }
                }
            }
        });
    });
}
function getArgsAndVars(field, nodeName, config, schema, providedValues) {
    const fieldName = field.name.value;
    const allArgs = field.arguments;
    const args = [];
    const variableDefinitionsMap = {};
    const requiredArguments = allArgs.filter((arg) => considerArgument(arg, config));
    // Check for slicing arguments defined in a @listSize directive that should
    // be present:
    const missingSlicingArg = getMissingSlicingArg(requiredArguments, field, schema);
    if (missingSlicingArg)
        requiredArguments.push(missingSlicingArg);
    requiredArguments.forEach((arg) => {
        const varName = `${nodeName}__${fieldName}__${arg.name.value}`;
        args.push(getVariable(arg.name.value, varName));
        variableDefinitionsMap[varName] = getVariableDefinition(varName, arg.type);
    });
    const variableValues = {};
    // First, check for providers based on type__field query
    // (Note: such a provider must return a value which is an object)
    const { providerFound, value } = provide_variables_1.getProviderValue(`${nodeName}__${fieldName}`, config, providedValues);
    if (providerFound && typeof value === 'object') {
        Object.entries(value).forEach(([argName, value]) => {
            const varName = `${nodeName}__${fieldName}__${argName}`;
            // Only consider required arguments (provider can provide more than necessary)
            if (Object.keys(variableDefinitionsMap).includes(varName)) {
                variableValues[varName] = value;
            }
        });
    }
    // Second, check for providers based on type__field__argument query
    // (Note: they overwrite possibly already provided values)
    requiredArguments.forEach((arg) => {
        const varName = `${nodeName}__${fieldName}__${arg.name.value}`;
        const argType = schema.getType(getTypeName(arg.type));
        const { providerFound, value } = provide_variables_1.getProviderValue(varName, config, Object.assign(Object.assign({}, variableValues), providedValues), // pass already used variable values
        argType);
        if (providerFound) {
            variableValues[varName] = value;
        }
    });
    // Third, populate all so-far neglected require variables with defaults or null
    requiredArguments.forEach((arg) => {
        const varName = `${nodeName}__${fieldName}__${arg.name.value}`;
        const argType = schema.getType(getTypeName(arg.type));
        if (typeof variableValues[varName] === 'undefined') {
            if (provide_variables_1.isEnumType(argType)) {
                variableValues[varName] = provide_variables_1.getRandomEnum(argType);
            }
            else if (config.providePlaceholders) {
                variableValues[varName] = provide_variables_1.getDefaultArgValue(schema, config, arg.type);
            }
            else if (arg.type.kind === 'NonNullType') {
                throw new Error(`Missing provider for non-null variable "${varName}" of type "${graphql_1.print(arg.type)}". ` +
                    `Either add a provider (e.g., using a wildcard "*__*" or "*__*__*"), ` +
                    `or set providePlaceholders configuration option to true.`);
            }
            else {
                variableValues[varName] = null;
            }
        }
    });
    return {
        args,
        variableDefinitionsMap,
        variableValues
    };
}
function getSelectionSetAndVars(schema, node, config, depth = 0) {
    let selections = [];
    let variableDefinitionsMap = {};
    let variableValues = {};
    // Abort at leaf nodes:
    if (depth === config.maxDepth) {
        return {
            selectionSet: undefined,
            variableDefinitionsMap,
            variableValues
        };
    }
    if (node.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION) {
        let fields = getRandomFields(node.fields, config, schema, depth);
        fields.forEach((field) => {
            // Recurse, if field has children:
            const nextNode = schema.getType(getTypeName(field.type)).astNode;
            let selectionSet = undefined;
            if (typeof nextNode !== 'undefined') {
                const res = getSelectionSetAndVars(schema, nextNode, config, depth + 1);
                // Update counts and nodeFactor:
                config.resolveCount += config.nodeFactor;
                config.nodeFactor *= getNextNodefactor(res.variableValues);
                config.typeCount += config.nodeFactor;
                selectionSet = res.selectionSet;
                variableDefinitionsMap = Object.assign(Object.assign({}, variableDefinitionsMap), res.variableDefinitionsMap);
                variableValues = Object.assign(Object.assign({}, variableValues), res.variableValues);
            }
            const avs = getArgsAndVars(field, node.name.value, config, schema, variableValues);
            variableDefinitionsMap = Object.assign(Object.assign({}, variableDefinitionsMap), avs.variableDefinitionsMap);
            variableValues = Object.assign(Object.assign({}, variableValues), avs.variableValues);
            selections.push({
                kind: graphql_1.Kind.FIELD,
                name: getName(field.name.value),
                selectionSet,
                arguments: avs.args
            });
        });
    }
    else if (node.kind === graphql_1.Kind.INTERFACE_TYPE_DEFINITION) {
        let fields = getRandomFields(node.fields, config, schema, depth);
        fields.forEach((field) => {
            // Recurse, if field has children:
            const nextNode = schema.getType(getTypeName(field.type)).astNode;
            let selectionSet = undefined;
            if (typeof nextNode !== 'undefined') {
                const res = getSelectionSetAndVars(schema, nextNode, config, depth + 1);
                // Update counts and nodeFactor:
                config.resolveCount += config.nodeFactor;
                config.nodeFactor *= getNextNodefactor(res.variableValues);
                config.typeCount += config.nodeFactor;
                selectionSet = res.selectionSet;
                variableDefinitionsMap = Object.assign(Object.assign({}, variableDefinitionsMap), res.variableDefinitionsMap);
                variableValues = Object.assign(Object.assign({}, variableValues), res.variableValues);
            }
            const avs = getArgsAndVars(field, node.name.value, config, schema, variableValues);
            variableDefinitionsMap = Object.assign(Object.assign({}, variableDefinitionsMap), avs.variableDefinitionsMap);
            variableValues = Object.assign(Object.assign({}, variableValues), avs.variableValues);
            selections.push({
                kind: graphql_1.Kind.FIELD,
                name: getName(field.name.value),
                selectionSet,
                arguments: avs.args
            });
        });
        // Get all objects that implement an interface
        let objectsImplementingInterface = Object.values(schema.getTypeMap()).filter((namedType) => {
            if (namedType.astNode &&
                namedType.astNode.kind === 'ObjectTypeDefinition') {
                let interfaceNames = namedType.astNode.interfaces.map((interfaceNamedType) => {
                    return interfaceNamedType.name.value;
                });
                if (interfaceNames.includes(node.name.value)) {
                    return true;
                }
            }
            return false;
        });
        // Randomly select named types from the union
        let pickObjectsImplementingInterface = objectsImplementingInterface.filter(() => {
            if (typeof config.breadthProbability === 'number') {
                return random(config) <= config.breadthProbability;
            }
            else {
                return random(config) <= config.breadthProbability(depth);
            }
        });
        // If no named types are selected, select any one
        if (pickObjectsImplementingInterface.length === 0) {
            const forcedCleanIndex = Math.floor(random(config) * objectsImplementingInterface.length);
            pickObjectsImplementingInterface.push(objectsImplementingInterface[forcedCleanIndex]);
        }
        pickObjectsImplementingInterface.forEach((namedType) => {
            if (namedType.astNode) {
                let type = namedType.astNode;
                // Unions can only contain objects
                if (type.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION) {
                    // Get selections
                    let selectionSet = undefined;
                    const res = getSelectionSetAndVars(schema, type, config, depth);
                    selectionSet = res.selectionSet;
                    variableDefinitionsMap = Object.assign(Object.assign({}, variableDefinitionsMap), res.variableDefinitionsMap);
                    variableValues = Object.assign(Object.assign({}, variableValues), res.variableValues);
                    let fragment = {
                        kind: graphql_1.Kind.INLINE_FRAGMENT,
                        typeCondition: {
                            kind: graphql_1.Kind.NAMED_TYPE,
                            name: {
                                kind: graphql_1.Kind.NAME,
                                value: type.name.value
                            }
                        },
                        selectionSet: selectionSet
                    };
                    selections.push(fragment);
                }
                else {
                    throw Error(`There should only be object types ` +
                        `in the selectionSet but found: ` +
                        `"${JSON.stringify(type, null, 2)}"`);
                }
            }
            else {
                selections.push({
                    kind: graphql_1.Kind.FIELD,
                    name: {
                        kind: graphql_1.Kind.NAME,
                        value: namedType.name
                    }
                });
            }
        });
    }
    else if (node.kind === graphql_1.Kind.UNION_TYPE_DEFINITION) {
        // Get the named types in the union
        let unionNamedTypes = node.types.map((namedTypeNode) => {
            return schema.getType(namedTypeNode.name.value);
        });
        // Randomly select named types from the union
        let pickUnionNamedTypes = unionNamedTypes.filter(() => {
            if (typeof config.breadthProbability === 'number') {
                return random(config) <= config.breadthProbability;
            }
            else {
                return random(config) <= config.breadthProbability(depth);
            }
        });
        // If no named types are selected, select any one
        if (pickUnionNamedTypes.length === 0) {
            const forcedCleanIndex = Math.floor(random(config) * unionNamedTypes.length);
            pickUnionNamedTypes.push(unionNamedTypes[forcedCleanIndex]);
        }
        pickUnionNamedTypes.forEach((namedType) => {
            if (namedType.astNode) {
                let type = namedType.astNode;
                // Unions can only contain objects
                if (type.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION) {
                    // Get selections
                    let selectionSet = undefined;
                    const res = getSelectionSetAndVars(schema, type, config, depth);
                    selectionSet = res.selectionSet;
                    variableDefinitionsMap = Object.assign(Object.assign({}, variableDefinitionsMap), res.variableDefinitionsMap);
                    variableValues = Object.assign(Object.assign({}, variableValues), res.variableValues);
                    let fragment = {
                        kind: graphql_1.Kind.INLINE_FRAGMENT,
                        typeCondition: {
                            kind: graphql_1.Kind.NAMED_TYPE,
                            name: {
                                kind: graphql_1.Kind.NAME,
                                value: type.name.value
                            }
                        },
                        selectionSet: selectionSet
                    };
                    selections.push(fragment);
                }
                else {
                    throw Error(`There should only be object types ` +
                        `in the selectionSet but found: ` +
                        `"${JSON.stringify(type, null, 2)}"`);
                }
            }
            else {
                selections.push({
                    kind: graphql_1.Kind.FIELD,
                    name: {
                        kind: graphql_1.Kind.NAME,
                        value: namedType.name
                    }
                });
            }
        });
    }
    let aliasIndexes = {};
    let cleanselections = [];
    // Ensure unique field names/aliases
    selections.forEach((selectionNode) => {
        if (selectionNode.kind === graphql_1.Kind.FIELD) {
            let fieldName = selectionNode.name.value;
            if (fieldName in aliasIndexes) {
                cleanselections.push(Object.assign(Object.assign({}, selectionNode), {
                    alias: {
                        kind: graphql_1.Kind.NAME,
                        value: `${fieldName}${aliasIndexes[fieldName]++}`
                    }
                }));
            }
            else {
                aliasIndexes[fieldName] = 2;
                cleanselections.push(selectionNode);
            }
        }
        else if (selectionNode.kind === graphql_1.Kind.INLINE_FRAGMENT) {
            let cleanFragmentSelections = [];
            selectionNode.selectionSet.selections.forEach((fragmentSelectionNode) => {
                if (fragmentSelectionNode.kind === graphql_1.Kind.FIELD) {
                    let fieldName = fragmentSelectionNode.name.value;
                    if (fieldName in aliasIndexes) {
                        cleanFragmentSelections.push(Object.assign(Object.assign({}, fragmentSelectionNode), {
                            alias: {
                                kind: graphql_1.Kind.NAME,
                                value: `${fieldName}${aliasIndexes[fieldName]++}`
                            }
                        }));
                    }
                    else {
                        aliasIndexes[fieldName] = 2;
                        cleanFragmentSelections.push(fragmentSelectionNode);
                    }
                }
            });
            selectionNode.selectionSet.selections = cleanFragmentSelections;
            cleanselections.push(selectionNode);
        }
        else {
            throw Error(`There should not be any fragment spreads in the selectionNode "${JSON.stringify(selectionNode, null, 2)}"`);
        }
    });
    return {
        selectionSet: cleanselections.length > 0
            ? {
                kind: graphql_1.Kind.SELECTION_SET,
                selections: cleanselections
            }
            : undefined,
        variableDefinitionsMap,
        variableValues
    };
}
function generateRandomMutation(schema, config = {}) {
    const finalConfig = Object.assign(Object.assign(Object.assign({}, DEFAULT_CONFIG), config), { seed: typeof config.seed !== 'undefined' ? config.seed : Math.random(), nodeFactor: 1, typeCount: 0, resolveCount: 0 });
    const { mutationDocument, variableValues } = getMutationOperationDefinition(schema, finalConfig);
    const definitions = [mutationDocument];
    return {
        mutationDocument: getDocumentDefinition(definitions),
        variableValues,
        seed: finalConfig.seed,
        typeCount: finalConfig.typeCount,
        resolveCount: finalConfig.resolveCount
    };
}
exports.generateRandomMutation = generateRandomMutation;
function generateRandomQuery(schema, config = {}) {
    const finalConfig = Object.assign(Object.assign(Object.assign({}, DEFAULT_CONFIG), config), { seed: typeof config.seed !== 'undefined' ? config.seed : Math.random(), nodeFactor: 1, typeCount: 0, resolveCount: 0 });
    const { queryDocument, variableValues } = getQueryOperationDefinition(schema, finalConfig);
    const definitions = [queryDocument];
    return {
        queryDocument: getDocumentDefinition(definitions),
        variableValues,
        seed: finalConfig.seed,
        typeCount: finalConfig.typeCount,
        resolveCount: finalConfig.resolveCount
    };
}
exports.generateRandomQuery = generateRandomQuery;
function random(config) {
    if (typeof config.nextSeed !== 'undefined') {
        config.nextSeed = seedrandom(config.nextSeed)();
        return config.nextSeed;
    }
    else {
        config.nextSeed = seedrandom(config.seed)();
        return config.nextSeed;
    }
}
//# sourceMappingURL=generate-query.js.map