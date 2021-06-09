"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const generate_query_1 = require("./generate-query");
function doMatch(a, b) {
    return a === b || a === '*' || b === '*';
}
function matchVarName(query, candidates) {
    // Case: exact match
    if (candidates.includes(query)) {
        return query;
    }
    const queryParts = query.split(/__(?!__)/g);
    if (!(queryParts.length === 2 || queryParts.length === 3)) {
        throw new Error(`Invalid variable name query: ${query}`);
    }
    for (let candidate of candidates) {
        const candidateParts = candidate.split(/__(?!__)/g);
        if (!(candidateParts.length === 2 || candidateParts.length === 3)) {
            throw new Error(`Invalid variable name: ${candidate}`);
        }
        if (candidateParts.length === queryParts.length) {
            const match = candidateParts.every((candPart, i) => {
                return doMatch(candPart, queryParts[i]);
            });
            if (match) {
                return candidate;
            }
        }
    }
    return null;
}
exports.matchVarName = matchVarName;
function getProvider(varName, providerMap) {
    const providerKey = matchVarName(varName, Object.keys(providerMap));
    if (providerKey) {
        return {
            providerFound: true,
            provider: providerMap[providerKey]
        };
    }
    else {
        return {
            providerFound: false,
            provider: null
        };
    }
}
exports.getProvider = getProvider;
function getRandomEnum(type) {
    const typeDef = type.astNode;
    if (typeof typeDef !== 'undefined' &&
        typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION) {
        let value = typeDef.values[Math.floor(Math.random() * typeDef.values.length)];
        return value.name.value;
    }
}
exports.getRandomEnum = getRandomEnum;
function isEnumType(type) {
    const typeDef = type.astNode;
    if (typeof typeDef !== 'undefined' &&
        typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION) {
        return true;
    }
    return false;
}
exports.isEnumType = isEnumType;
function getProviderValue(varName, config, providedValues, argType) {
    const { providerFound, provider } = getProvider(varName, config.providerMap);
    return {
        providerFound,
        value: typeof provider === 'function'
            ? provider(providedValues, argType)
            : provider
    };
}
exports.getProviderValue = getProviderValue;
function getDefaultArgValue(schema, config, type) {
    if (type.kind === 'NamedType') {
        if (type.name.value === 'Int') {
            return 10;
        }
        else if (type.name.value === 'Float') {
            return 10.0;
        }
        else if (type.name.value === 'Boolean') {
            return true;
        }
        else {
            if (schema.getType(type.name.value)) {
                const typeDef = schema.getType(type.name.value);
                if (!typeDef)
                    new Error('Cannot find input object type definition with this name ' + type.name.value);
                const fields = typeDef.getFields();
                const requiredArguments = Object.entries(fields).map(([_, value]) => value).filter((type) => {
                    return generate_query_1.considerArgument(type.astNode, config);
                });
                return requiredArguments.reduce((obj, arg) => {
                    obj[arg.astNode.name.value] = getDefaultArgValue(schema, config, arg.astNode.type);
                    return obj;
                }, {});
            }
            else {
                // Case: String, ID, or custom scalar:
                return 'PLACEHOLDER';
            }
        }
    }
    else if (type.kind === 'NonNullType') {
        return getDefaultArgValue(schema, config, type.type);
    }
    else if (type.kind === 'ListType') {
        return [getDefaultArgValue(schema, config, type.type)];
    }
}
exports.getDefaultArgValue = getDefaultArgValue;
//# sourceMappingURL=provide-variables.js.map