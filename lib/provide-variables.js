"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const generate_query_1 = require("./generate-query");
function getProvider(providerMap, varName) {
    // case: exact match
    if (typeof providerMap[varName] !== 'undefined') {
        return providerMap[varName];
    }
    // case: wildcard match
    let result = null;
    const varNameParts = varName.split('__');
    if (varNameParts.length !== 3) {
        throw new Error(`Invalid variable name "${varName}"`);
    }
    function doMatch(a, b) {
        return a === b || a === '*' || b === '*';
    }
    Object.keys(providerMap).forEach(providerName => {
        const providerNameParts = providerName.split('__');
        if (varNameParts.length !== 3) {
            throw new Error(`Invalid provider name "${varName}"`);
        }
        const match = varNameParts.every((varNamePart, i) => {
            return doMatch(varNamePart, providerNameParts[i]);
        });
        if (match) {
            result = providerMap[providerName];
        }
    });
    return result;
}
function isEnumVar(varDef, schema) {
    const type = schema.getType(generate_query_1.getTypeName(varDef.type));
    const typeDef = type.astNode;
    if (typeof typeDef !== 'undefined' && typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION) {
        return true;
    }
    return false;
}
function getRandomEnum(varDef, schema) {
    const type = schema.getType(generate_query_1.getTypeName(varDef.type));
    const typeDef = type.astNode;
    if (typeof typeDef !== 'undefined' && typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION) {
        let value = typeDef.values[Math.floor(Math.random() * typeDef.values.length)];
        return value.name.value;
    }
}
function provideVariables(query, providerMap, schema) {
    const operationDefinitions = query.definitions
        .filter(d => d.kind === graphql_1.Kind.OPERATION_DEFINITION);
    if (operationDefinitions.length === 0) {
        throw new Error(`Given query has no operation definition`);
    }
    // we know that we have an operation defintion node at this point:
    const operationDefinition = operationDefinitions[0];
    const variables = {};
    operationDefinition.variableDefinitions.forEach(varDef => {
        const varName = varDef.variable.name.value;
        const provider = getProvider(providerMap, varName);
        let varValue = null;
        if (isEnumVar(varDef, schema)) {
            varValue = getRandomEnum(varDef, schema);
        }
        else if (!provider) {
            throw new Error(`No provider defined for variable "${varName}"`);
        }
        else if (typeof provider === 'function') {
            varValue = provider(variables);
        }
        else {
            varValue = provider;
        }
        variables[varName] = varValue;
    });
    return variables;
}
exports.provideVariables = provideVariables;
//# sourceMappingURL=provide-variables.js.map