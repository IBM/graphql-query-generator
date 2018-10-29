"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
function getProvider(varName, type, providerMap) {
    // case: no providers:
    if (typeof providerMap === 'undefined') {
        throw new Error(`No provider found for "${varName}" in ` +
            `${JSON.stringify(providerMap)}. ` +
            `Consider applying wildcard provider with "*__*__*"`);
    }
    // case: exact match
    if (typeof providerMap[varName] !== 'undefined') {
        return providerMap[varName];
    }
    // case: wildcard match
    let provider = null;
    let providerFound = false;
    const varNameParts = varName.split(/(?<!__)__/g);
    if (varNameParts.length !== 3) {
        throw new Error(`Invalid variable name "${varName}"`);
    }
    function doMatch(a, b) {
        return a === b || a === '*' || b === '*';
    }
    Object.keys(providerMap).forEach(providerName => {
        const providerNameParts = providerName.split(/(?<!__)__/g);
        if (varNameParts.length !== 3) {
            throw new Error(`Invalid provider name "${varName}"`);
        }
        const match = varNameParts.every((varNamePart, i) => {
            return doMatch(varNamePart, providerNameParts[i]);
        });
        if (match) {
            providerFound = true;
            provider = providerMap[providerName];
        }
    });
    // throw error if no provider was found:
    if (!providerFound && !isEnumType(type)) {
        throw new Error(`No provider found for "${varName}" in ` +
            `${JSON.stringify(providerMap)}. ` +
            `Consider applying wildcard provider with "*__*__*"`);
    }
    return provider;
}
function getRandomEnum(type) {
    const typeDef = type.astNode;
    if (typeof typeDef !== 'undefined' && typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION) {
        let value = typeDef.values[Math.floor(Math.random() * typeDef.values.length)];
        return value.name.value;
    }
}
function isEnumType(type) {
    const typeDef = type.astNode;
    if (typeof typeDef !== 'undefined' && typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION) {
        return true;
    }
    return false;
}
function provideVaribleValue(varName, type, config, providedValues) {
    const provider = getProvider(varName, type, config.providerMap);
    let varValue = null;
    if (isEnumType(type)) {
        varValue = getRandomEnum(type);
    }
    else if (typeof provider === 'function') {
        varValue = provider(providedValues);
    }
    else {
        varValue = provider;
    }
    return varValue;
}
exports.provideVaribleValue = provideVaribleValue;
//# sourceMappingURL=provide-variables.js.map