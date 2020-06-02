import { GraphQLSchema } from "graphql";
import { Configuration } from "graphql-query-generator";
declare class GitHubQueryGenerator {
  gitHubSchema: GraphQLSchema;
  gitHubQueryConfig: Configuration;
  constructor(gitHubSchema: any, gitHubQueryConfig: any);
  generateRandomGitHubQuery(): {
    queryDocument: import("graphql").DocumentNode;
    variableValues: {
      [varName: string]: any;
    };
    seed: number;
    typeCount: number;
    resolveCount: number;
  };
}
export declare function getGitHubQueryGenerator(): Promise<
  GitHubQueryGenerator
>;
export {};
