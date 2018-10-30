"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const provide_variables_1 = require("./provide-variables");
const DEFAULT_CONFIG = {
    depthProbability: 0.5,
    breadthProbability: 0.5,
    maxDepth: 5,
    ignoreOptionalArguments: true,
    argumentsToIgnore: [],
    argumentsToConsider: []
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
function isNestedField(field, schema) {
    return typeof schema.getType(getTypeName(field.type)).astNode !== 'undefined';
}
function isInterfaceField(field, schema) {
    const ast = schema.getType(getTypeName(field.type)).astNode;
    return typeof ast !== 'undefined' && ast.kind === graphql_1.Kind.INTERFACE_TYPE_DEFINITION;
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
function isUnionField(field, schema) {
    const ast = schema.getType(getTypeName(field.type)).astNode;
    return typeof ast !== 'undefined' && ast.kind === graphql_1.Kind.UNION_TYPE_DEFINITION;
}
function getRandomFields(fields, config, schema, depth) {
    const results = [];
    // filter Interfaces and Unions (for now):
    const cleanFields = fields
        .filter(field => !isInterfaceField(field, schema))
        .filter(field => !isUnionField(field, schema));
    if (cleanFields.length === 0) {
        return results;
    }
    const nested = cleanFields.filter(field => isNestedField(field, schema));
    const flat = cleanFields.filter(field => !isNestedField(field, schema));
    const nextIsLeaf = depth + 1 === config.maxDepth;
    const pickNested = Math.random() <= config.depthProbability;
    // console.log(` depth=${depth}, maxDepth=${config.maxDepth}, nextIsLeaf=${nextIsLeaf}, pickOneNested=${pickNested} cleanFields= ${cleanFields.map(f => f.name.value).join(', ')}`)
    // if depth probability is high, definitely chose one nested field if one exists:
    if (pickNested && nested.length > 0 && !nextIsLeaf) {
        let nestedIndex = Math.floor(Math.random() * nested.length);
        results.push(nested[nestedIndex]);
        nested.splice(nestedIndex, 1);
        nested.forEach(field => {
            if (Math.random() <= config.breadthProbability) {
                results.push(field);
            }
        });
    }
    // pick flat fields based on the breadth probability:
    flat.forEach(field => {
        if (Math.random() <= config.breadthProbability) {
            results.push(field);
        }
    });
    // ensure to pick at least one field:
    if (results.length === 0) {
        if (!nextIsLeaf && cleanFields.length > 0) {
            results.push(cleanFields[Math.floor(Math.random() * cleanFields.length)]);
        }
        else if (flat.length > 0) {
            results.push(flat[Math.floor(Math.random() * flat.length)]);
        }
        else {
            throw new Error(`Cannot pick field from: ${cleanFields.join(', ')}`);
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
    return {
        selectionSet: selections.length > 0
            ? {
                kind: graphql_1.Kind.SELECTION_SET,
                selections
            }
            : undefined,
        variableDefinitionsMap,
        variableValues
    };
}
function generateRandomMutation(schema, config = {}) {
    const finalConfig = Object.assign({ config }, DEFAULT_CONFIG);
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
        variableValues
    };
}
exports.generateRandomMutation = generateRandomMutation;
function generateRandomQuery(schema, config = {}) {
    const finalConfig = Object.assign({}, DEFAULT_CONFIG, config);
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
        variableValues
    };
}
exports.generateRandomQuery = generateRandomQuery;
//# sourceMappingURL=generate-query.js.map