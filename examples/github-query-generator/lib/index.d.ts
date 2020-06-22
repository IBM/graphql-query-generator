import { GraphQLSchema } from 'graphql';
import { Configuration } from 'ibm-graphql-query-generator';
declare class GitHubQueryGenerator {
    gitHubSchema: GraphQLSchema;
    gitHubQueryConfig: Configuration;
    constructor(gitHubSchema: GraphQLSchema, gitHubQueryConfig: Configuration);
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
export declare function getGitHubQueryGenerator(gitHubAccessToken: string): Promise<GitHubQueryGenerator>;
export {};
