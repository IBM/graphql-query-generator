import { DocumentNode, GraphQLSchema, TypeNode } from 'graphql';
export declare type Configuration = {
    depthProbability?: number;
    breadthProbability?: number;
    maxDepth?: number;
    ignoreOptionalArguments?: boolean;
    argumentsToIgnore?: string[];
    argumentsToConsider?: string[];
};
export declare function getTypeName(type: TypeNode): string;
export declare function generateRandomMutation(schema: GraphQLSchema, config?: Configuration): DocumentNode;
export declare function generateRandomQuery(schema: GraphQLSchema, config?: Configuration): DocumentNode;
