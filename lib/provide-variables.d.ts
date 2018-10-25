import { DocumentNode, GraphQLSchema } from 'graphql';
declare type Primitive = string | boolean | number | Date;
export declare type ProviderMap = {
    [argTriple: string]: Primitive | Object | Array<any> | Function;
};
export declare function provideVariables(query: DocumentNode, providerMap: ProviderMap, schema: GraphQLSchema): {
    [variableName: string]: Primitive | Object | Array<any>;
};
export {};
