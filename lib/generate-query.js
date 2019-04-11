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
    pickNestedQueryField: false
};
// default loc:
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
function getQueryOperationDefinition(schema, config) {
    const node = schema.getQueryType().astNode;
    const { selectionSet, variableDefinitionsMap, variableValues } = getSelectionSetAndVars(schema, node, config);
    // throw error if query would be empty:
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
    // throw error if mutation would be empty:
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
    return typeof ast !== 'undefined' && ast.kind === graphql_1.Kind.INTERFACE_TYPE_DEFINITION;
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
    // checks for consistency:
    if (isMand && isArgumentToIgnore) {
        throw new Error(`Cannot ignore non-null argument "${arg.name.value}"`);
    }
    if (isArgumentToIgnore && isArgumentToConsider) {
        throw new Error(`Cannot ignore AND consider argument "${arg.name.value}"`);
    }
    // return value based on options:
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
}
function fieldHasLeafs(field, schema) {
    const ast = schema.getType(getTypeName(field.type)).astNode;
    if (ast.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION || ast.kind === graphql_1.Kind.INTERFACE_TYPE_DEFINITION) {
        return ast.fields.some(child => {
            const childAst = schema.getType(getTypeName(child.type)).astNode;
            return typeof childAst === 'undefined' ||
                childAst.kind === graphql_1.Kind.SCALAR_TYPE_DEFINITION;
        });
    }
    else if (ast.kind === graphql_1.Kind.UNION_TYPE_DEFINITION) {
        return ast.types.some((child => {
            let unionNamedTypes = schema.getType(child.name.value).astNode.fields;
            return unionNamedTypes.some(child => {
                const childAst = schema.getType(getTypeName(child.type)).astNode;
                return typeof childAst === 'undefined' ||
                    childAst.kind === graphql_1.Kind.SCALAR_TYPE_DEFINITION;
            });
        }));
    }
    return false;
}
function getRandomFields(fields, config, schema, depth) {
    const results = [];
    // create lists of nested and flat fields to pick from:
    let nested;
    let flat;
    if (config.considerInterfaces && config.considerUnions) {
        nested = fields.filter((field) => {
            return isObjectField(field, schema) || isInterfaceField(field, schema) || isUnionField(field, schema);
        });
        flat = fields.filter((field) => {
            return !(isObjectField(field, schema) || isInterfaceField(field, schema) || isUnionField(field, schema));
        });
    }
    else if (config.considerInterfaces && config.considerUnions) {
        fields = fields.filter((field => {
            return !isInterfaceField(field, schema);
        }));
        nested = fields.filter((field) => {
            return isObjectField(field, schema) || isUnionField(field, schema);
        });
        flat = fields.filter((field) => {
            return !(isObjectField(field, schema) || isUnionField(field, schema));
        });
    }
    else if (config.considerInterfaces && config.considerUnions) {
        fields = fields.filter((field => {
            return !isUnionField(field, schema);
        }));
        nested = fields.filter((field) => {
            return isObjectField(field, schema) || isInterfaceField(field, schema);
        });
        flat = fields.filter((field) => {
            return !(isObjectField(field, schema) || isInterfaceField(field, schema));
        });
    }
    else {
        fields = fields.filter((field => {
            return !(isInterfaceField(field, schema) || isUnionField(field, schema));
        }));
        nested = fields.filter((field) => {
            return isObjectField(field, schema);
        });
        flat = fields.filter((field) => {
            return !isObjectField(field, schema);
        });
    }
    // filter out fields that only have nested subfields:
    if (depth + 2 === config.maxDepth) {
        nested = nested.filter(field => fieldHasLeafs(field, schema));
    }
    const nextIsLeaf = depth + 1 === config.maxDepth;
    const pickNested = typeof config.depthProbability === 'number'
        ? random(config) <= config.depthProbability
        : random(config) <= config.depthProbability(depth);
    // if we decide to pick nested, choose one nested field (if one exists)...
    if ((pickNested && nested.length > 0 && !nextIsLeaf) || (depth === 0 && config.pickNestedQueryField)) {
        let nestedIndex = Math.floor(random(config) * nested.length);
        results.push(nested[nestedIndex]);
        nested.splice(nestedIndex, 1);
        // ...and possibly choose more:
        nested.forEach(field => {
            const pickNested = typeof config.breadthProbability === 'number'
                ? random(config) <= config.breadthProbability
                : random(config) <= config.breadthProbability(depth);
            if (pickNested) {
                results.push(field);
            }
        });
    }
    // pick flat fields based on the breadth probability:
    flat.forEach(field => {
        const pickFlat = typeof config.breadthProbability === 'number'
            ? random(config) <= config.breadthProbability
            : random(config) <= config.breadthProbability(depth);
        if (pickFlat) {
            results.push(field);
        }
    });
    // ensure to pick at least one field:
    if (results.length === 0) {
        // if the next level is not the last, we can choose ANY field:
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
            throw new Error(`Cannot pick field from: ${fields.map(fd => fd.name.value).join(', ')}`);
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
function getArgsAndVars(allArgs, nodeName, fieldName, config, schema, providedValues) {
    const args = [];
    const variableDefinitionsMap = {};
    const variableValues = {};
    allArgs
        .filter(arg => considerArgument(arg, config))
        .forEach(arg => {
        const varName = `${nodeName}__${fieldName}__${arg.name.value}`;
        args.push(getVariable(arg.name.value, varName));
        variableDefinitionsMap[varName] = getVariableDefinition(varName, arg.type);
        const argType = schema.getType(getTypeName(arg.type));
        variableValues[varName] = provide_variables_1.provideVaribleValue(varName, argType, config, Object.assign({}, variableValues, providedValues));
    });
    return { args, variableDefinitionsMap, variableValues };
}
function getSelectionSetAndVars(schema, node, config, depth = 0) {
    let selections = [];
    let variableDefinitionsMap = {};
    let variableValues = {};
    // abort at leaf nodes:
    if (depth === config.maxDepth) {
        return {
            selectionSet: undefined,
            variableDefinitionsMap,
            variableValues
        };
    }
    if (node.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION) {
        let fields = getRandomFields(node.fields, config, schema, depth);
        fields.forEach(field => {
            // recurse, if field has children:
            const nextNode = schema.getType(getTypeName(field.type)).astNode;
            let selectionSet = undefined;
            if (typeof nextNode !== 'undefined') {
                const res = getSelectionSetAndVars(schema, nextNode, config, depth + 1);
                selectionSet = res.selectionSet;
                variableDefinitionsMap = Object.assign({}, variableDefinitionsMap, res.variableDefinitionsMap);
                variableValues = Object.assign({}, variableValues, res.variableValues);
            }
            const avs = getArgsAndVars(field.arguments, node.name.value, field.name.value, config, schema, variableValues);
            variableDefinitionsMap = Object.assign({}, variableDefinitionsMap, avs.variableDefinitionsMap);
            variableValues = Object.assign({}, variableValues, avs.variableValues);
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
        fields.forEach(field => {
            // recurse, if field has children:
            const nextNode = schema.getType(getTypeName(field.type)).astNode;
            let selectionSet = undefined;
            if (typeof nextNode !== 'undefined') {
                const res = getSelectionSetAndVars(schema, nextNode, config, depth + 1);
                selectionSet = res.selectionSet;
                variableDefinitionsMap = Object.assign({}, variableDefinitionsMap, res.variableDefinitionsMap);
                variableValues = Object.assign({}, variableValues, res.variableValues);
            }
            const avs = getArgsAndVars(field.arguments, node.name.value, field.name.value, config, schema, variableValues);
            variableDefinitionsMap = Object.assign({}, variableDefinitionsMap, avs.variableDefinitionsMap);
            variableValues = Object.assign({}, variableValues, avs.variableValues);
            selections.push({
                kind: graphql_1.Kind.FIELD,
                name: getName(field.name.value),
                selectionSet,
                arguments: avs.args
            });
        });
        // get all objects that implement an interface
        let objectsImplementingInterface = Object.values(schema.getTypeMap()).filter((namedType) => {
            if (namedType.astNode && namedType.astNode.kind === "ObjectTypeDefinition") {
                let interfaceNames = namedType.astNode.interfaces.map((interfaceNamedType) => {
                    return interfaceNamedType.name.value;
                });
                if (interfaceNames.includes(node.name.value)) {
                    return true;
                }
            }
            return false;
        });
        // randomly select named types from the union
        let pickObjectsImplementingInterface = objectsImplementingInterface.filter(() => {
            if (typeof config.breadthProbability === 'number') {
                return random(config) <= config.breadthProbability;
            }
            else {
                return random(config) <= config.breadthProbability(depth);
            }
        });
        // if no named types are selected, select any one
        if (pickObjectsImplementingInterface.length === 0) {
            const forcedCleanIndex = Math.floor(random(config) * objectsImplementingInterface.length);
            pickObjectsImplementingInterface.push(objectsImplementingInterface[forcedCleanIndex]);
        }
        pickObjectsImplementingInterface.forEach((namedType) => {
            if (namedType.astNode) {
                let type = namedType.astNode;
                // unions can only contain objects
                if (type.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION) {
                    // Get selections
                    let selectionSet = undefined;
                    const res = getSelectionSetAndVars(schema, type, config, depth);
                    selectionSet = res.selectionSet;
                    variableDefinitionsMap = Object.assign({}, variableDefinitionsMap, res.variableDefinitionsMap);
                    variableValues = Object.assign({}, variableValues, res.variableValues);
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
        // get the named types in the union
        let unionNamedTypes = node.types.map((namedTypeNode) => {
            return schema.getType(namedTypeNode.name.value);
        });
        // randomly select named types from the union
        let pickUnionNamedTypes = unionNamedTypes.filter(() => {
            if (typeof config.breadthProbability === 'number') {
                return random(config) <= config.breadthProbability;
            }
            else {
                return random(config) <= config.breadthProbability(depth);
            }
        });
        // if no named types are selected, select any one
        if (pickUnionNamedTypes.length === 0) {
            const forcedCleanIndex = Math.floor(random(config) * unionNamedTypes.length);
            pickUnionNamedTypes.push(unionNamedTypes[forcedCleanIndex]);
        }
        // // Used to make ensure unique field names/aliases
        // let fieldNames = {}
        pickUnionNamedTypes.forEach((namedType) => {
            if (namedType.astNode) {
                let type = namedType.astNode;
                // unions can only contain objects
                if (type.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION) {
                    // Get selections
                    let selectionSet = undefined;
                    const res = getSelectionSetAndVars(schema, type, config, depth);
                    selectionSet = res.selectionSet;
                    variableDefinitionsMap = Object.assign({}, variableDefinitionsMap, res.variableDefinitionsMap);
                    variableValues = Object.assign({}, variableValues, res.variableValues);
                    // // Make sure selections do not have overlapping field names/aliases
                    // selectionSet.selections.forEach((selectionNode) => {      
                    //   if (selectionNode.kind === Kind.FIELD) {
                    //     let fieldName = selectionNode.name.value
                    //     // Get the type of the field
                    //     // Can be nonnullable
                    //     let nextType = type.fields.find((fd) => {
                    //       return fd.name.value === fieldName
                    //     }).type
                    //     // See if this field name/alias has been encountered before
                    //     if (fieldName in fieldNames) {
                    //       // See if the type matches the stored type
                    //       if (fieldNames[fieldName].stringifiedPreferredType !== JSON.stringify(nextType)) {
                    //         // Add alias
                    //         selectionNode = {...selectionNode, ...{alias: {
                    //           kind: Kind.NAME,
                    //           value: `${fieldName}${fieldNames[fieldName].aliasNumber++}`
                    //         }}}
                    //       }
                    //     // This field name/alias has not been encountered before
                    //     } else {
                    //       // Store the field name
                    //       fieldNames[fieldName] = {
                    //         stringifiedPreferredType: JSON.stringify(nextType),
                    //         aliasNumber: 2
                    //       }
                    //     }
                    //   } else if (selectionNode.kind === Kind.INLINE_FRAGMENT) {
                    //     selectionNode.selectionSet.selections.forEach((fragSelectionNode) => {
                    //       if (fragSelectionNode.kind === Kind.FIELD) {
                    //         // Get the type of the field
                    //         // Can be nonnullable
                    //         let nextType = type.fields.find((fd) => {
                    //           return fd.name.value === fieldName
                    //         }).type
                    //         // See if this field name/alias has been encountered before
                    //         if (fieldName in fieldNames) {
                    //           // See if the type matches the stored type
                    //           if (fieldNames[fieldName].stringifiedPreferredType !== JSON.stringify(nextType)) {
                    //             // Add alias
                    //             selectionNode = {...selectionNode, ...{alias: {
                    //               kind: Kind.NAME,
                    //               value: `${fieldName}${fieldNames[fieldName].aliasNumber++}`
                    //             }}}
                    //           }
                    //         // This field name/alias has not been encountered before
                    //         } else {
                    //           // Store the field name
                    //           fieldNames[fieldName] = {
                    //             stringifiedPreferredType: JSON.stringify(nextType),
                    //             aliasNumber: 2
                    //           }
                    //         }
                    //       } else {
                    //         // Ignore because will not affect this name space
                    //       }
                    //     })
                    //   } else {
                    //     throw Error(`There should only be fields or inline fragments ` + 
                    //       `in the selectionSet but found: ` + 
                    //       `"${JSON.stringify(selectionNode, null, 2)}"`, )
                    //   }
                    // })
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
    // ensure unique field names/aliases
    selections.forEach((selectionNode) => {
        if (selectionNode.kind === graphql_1.Kind.FIELD) {
            let fieldName = selectionNode.name.value;
            if (fieldName in aliasIndexes) {
                cleanselections.push(Object.assign({}, selectionNode, { alias: {
                        kind: graphql_1.Kind.NAME,
                        value: `${fieldName}${aliasIndexes[fieldName]++}`
                    } }));
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
                        cleanFragmentSelections.push(Object.assign({}, fragmentSelectionNode, { alias: {
                                kind: graphql_1.Kind.NAME,
                                value: `${fieldName}${aliasIndexes[fieldName]++}`
                            } }));
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
    const finalConfig = Object.assign({}, DEFAULT_CONFIG, config, { seed: typeof config.seed !== 'undefined'
            ? config.seed
            : Math.random() });
    // provide default providerMap:
    if (typeof finalConfig.providerMap !== 'object') {
        finalConfig.providerMap = {
            '*__*__*': null
        };
    }
    const { mutationDocument, variableValues } = getMutationOperationDefinition(schema, finalConfig);
    const definitions = [mutationDocument];
    return {
        mutationDocument: getDocumentDefinition(definitions),
        variableValues,
        seed: finalConfig.seed
    };
}
exports.generateRandomMutation = generateRandomMutation;
function generateRandomQuery(schema, config = {}) {
    const finalConfig = Object.assign({}, DEFAULT_CONFIG, config, { seed: typeof config.seed !== 'undefined'
            ? config.seed
            : Math.random() });
    // provide default providerMap:
    if (typeof finalConfig.providerMap !== 'object') {
        finalConfig.providerMap = {
            '*__*__*': null
        };
    }
    const { queryDocument, variableValues } = getQueryOperationDefinition(schema, finalConfig);
    const definitions = [queryDocument];
    return {
        queryDocument: getDocumentDefinition(definitions),
        variableValues,
        seed: finalConfig.seed
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