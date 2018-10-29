import { DocumentNode, GraphQLSchema, TypeNode } from 'graphql';
import { ProviderMap } from './provide-variables';
export declare type Configuration = {
    depthProbability?: number;
    breadthProbability?: number;
    maxDepth?: number;
    ignoreOptionalArguments?: boolean;
    argumentsToIgnore?: string[];
    argumentsToConsider?: string[];
    providerMap?: ProviderMap;
};
export declare function getTypeName(type: TypeNode): string;
export declare function generateRandomMutation(schema: GraphQLSchema, config?: Configuration): {
    mutationDocument: DocumentNode;
    variableValues: {
        [varName: string]: any;
    };
};
export declare function generateRandomQuery(schema: GraphQLSchema, config?: Configuration): {
    queryDocument: DocumentNode;
    variableValues: {
        [varName: string]: any;
    };
};
