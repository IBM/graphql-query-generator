import { GraphQLNamedType } from 'graphql';
import { Configuration } from './generate-query';
declare type Primitive = string | boolean | number | Date;
declare type Variables = {
    [varName: string]: any;
};
declare type ProviderFunction = (variables: Variables, argType: GraphQLNamedType) => any;
export declare type ProviderMap = {
    [varNameQuery: string]: Primitive | Object | Array<any> | ProviderFunction;
};
export declare function matchVarName(query: string, candidates: string[]): string;
export declare function provideVaribleValue(varName: string, type: GraphQLNamedType, config: Configuration, providedValues: Variables): any;
export {};
