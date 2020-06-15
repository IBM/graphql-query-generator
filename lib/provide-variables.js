"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
function doMatch(a, b) {
  return a === b || a === "*" || b === "*";
}
function matchVarName(query, candidates) {
  // Case: exact match
  if (candidates.includes(query)) {
    return query;
  }
  const queryParts = query.split(/(?<!__)__/g);
  if (!(queryParts.length === 2 || queryParts.length === 3)) {
    throw new Error(`Invalid variable name query: ${query}`);
  }
  for (let candidate of candidates) {
    const candidateParts = candidate.split(/(?<!__)__/g);
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
    return providerMap[providerKey];
  } else {
    return null;
  }
}
function getRandomEnum(type) {
  const typeDef = type.astNode;
  if (
    typeof typeDef !== "undefined" &&
    typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION
  ) {
    let value =
      typeDef.values[Math.floor(Math.random() * typeDef.values.length)];
    return value.name.value;
  }
}
exports.getRandomEnum = getRandomEnum;
function isEnumType(type) {
  const typeDef = type.astNode;
  if (
    typeof typeDef !== "undefined" &&
    typeDef.kind === graphql_1.Kind.ENUM_TYPE_DEFINITION
  ) {
    return true;
  }
  return false;
}
exports.isEnumType = isEnumType;
function getProviderValue(varName, config, providedValues, argType) {
  // If no providerMap was provided, then just create a query with no argument values
  if (config.providerMap) {
    const provider = getProvider(varName, config.providerMap);
    if (typeof provider === "function") {
      return provider(providedValues, argType);
    } else {
      return provider;
    }
  } else {
    return null;
  }
}
exports.getProviderValue = getProviderValue;
//# sourceMappingURL=provide-variables.js.map
