import { GraphQLNamedType } from 'graphql';
import { Configuration } from './generate-query';
declare type Primitive = string | boolean | number | Date;
export declare type ProviderMap = {
    [varNameQuery: string]: Primitive | Object | Array<any> | Function;
};
export declare function provideVaribleValue(varName: string, type: GraphQLNamedType, config: Configuration, providedValues: {
    [varName: string]: any;
}): any;
export {};
