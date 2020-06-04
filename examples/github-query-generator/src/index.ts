import * as fs from "fs";
import * as path from "path";

import { buildSchema, GraphQLSchema } from "graphql";
import { generateRandomQuery, Configuration } from "graphql-query-generator";
import { getProviderMap } from "./github-providers";

class GitHubQueryGenerator {
  gitHubSchema: GraphQLSchema;
  gitHubQueryConfig: Configuration;

  constructor(gitHubSchema: GraphQLSchema, gitHubQueryConfig: Configuration) {
    this.gitHubSchema = gitHubSchema;
    this.gitHubQueryConfig = gitHubQueryConfig;
  }

  public generateRandomGitHubQuery() {
    return generateRandomQuery(this.gitHubSchema, this.gitHubQueryConfig);
  }
}

export function getGitHubQueryGenerator(gitHubAccessToken: string) {
  return new Promise<GitHubQueryGenerator>((resolve, reject) => {
    const gitHubSchemaStr = fs.readFileSync(
      path.resolve(__dirname, "../fixtures/github.graphql"),
      "utf8"
    );
    const gitHubSchema = buildSchema(gitHubSchemaStr);

    getProviderMap(gitHubAccessToken).then((gitHubProviders) => {
      resolve(
        new GitHubQueryGenerator(gitHubSchema, {
          breadthProbability: 0.5,
          depthProbability: 0.5,
          maxDepth: 10,
          providerMap: gitHubProviders,
          argumentsToConsider: ["first"],
          considerUnions: true,
          pickNestedQueryField: true,
        })
      );
    });
  });
}
