import { Configuration, generateRandomQuery } from "../src";
import * as fs from "fs";
import { buildSchema, validate, print } from "graphql";

const schemaDefGitHub = fs
  .readFileSync("./test/fixtures/github.graphql")
  .toString();
const schemaGitHub = buildSchema(schemaDefGitHub);

test(`Generate single random query`, () => {
  const config: Configuration = {
    breadthProbability: (nesting) => {
      if (nesting === 0) {
        return 0.5;
      } else {
        return 1 / Math.pow(2, nesting);
      }
    },
    depthProbability: (nesting) => {
      if (nesting === 0) {
        return 0.5;
      } else {
        return 1 / Math.pow(2, nesting);
      }
    },
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ["first"],
    providerMap: {
      "*__*__*": (existingVars, argType) => {
        if (argType.name === "String") {
          return "test";
        } else if (argType.name === "Int") {
          return 1;
        } else if (argType.name === "Float") {
          return 1.0;
        } else if (argType.name === "Boolean") {
          return true;
        }
      },
    },
    considerInterfaces: false,
    considerUnions: true,
    pickNestedQueryField: true,
    seed: 0.9366856322996101,
  };

  const { queryDocument, variableValues } = generateRandomQuery(
    schemaGitHub,
    config
  );
  const errors = validate(schemaGitHub, queryDocument);

  expect(errors).toEqual([]);
});
