"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
function doMatch(a, b) {
    return a === b || a === '*' || b === '*';
}
function matchVarName(query, candidates) {
    // case: exact match:
    if (candidates.includes(query)) {
        return query;
    }
    const queryParts = query.split(/(?<!__)__/g);
    if (queryParts.length !== 3) {
        throw new Error(`Invalid variable name query: ${query}`);
    }
    for (let candidate of candidates) {
        const candidateParts = candidate.split(/(?<!__)__/g);
        if (candidateParts.length !== 3) {
            throw new Error(`Invalid variable name: ${candidate}`);
        }
        const match = candidateParts.every((candPart, i) => {
            return doMatch(candPart, queryParts[i]);
        });
        if (match) {
            return candidate;
        }
    }
    return null;
}
exports.matchVarName = matchVarName;
function getProvider(varName, type, providerMap) {
    // case: no providers:
    if (typeof providerMap === 'undefined') {
        throw new Error(`No provider found for "${varName}" in ` +
            `${JSON.stringify(providerMap)}. ` +
            `Consider applying wildcard provider with "*__*__*"`);
    }
    const providerKey = matchVarName(varName, Object.keys(providerMap));
    // throw error if no provider was found:
    if (!providerKey && !isEnumType(type)) {
        throw new Error(`No provider found for "${varName}" in ` +
            `${JSON.stringify(providerMap)}. ` +
            `Consider applying wildcard provider with "*__*__*"`);
    }
    return providerMap[providerKey];
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