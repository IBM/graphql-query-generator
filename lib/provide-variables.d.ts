import { GraphQLNamedType } from "graphql";
import { Configuration } from "./generate-query";
declare type Variables = {
  [varName: string]: any;
};
export declare type ProviderFunction = (
  variables: Variables,
  argType?: GraphQLNamedType
) =>
  | any // For type__field__argument providers
  | {
      [argumentName: string]: any;
    };
export declare type ProviderMap = {
  [varNameQuery: string]:
    | string
    | boolean
    | number
    | Date
    | Object
    | Array<any>
    | ProviderFunction;
};
export declare function matchVarName(
  query: string,
  candidates: string[]
): string;
export declare function getRandomEnum(type: GraphQLNamedType): string;
export declare function isEnumType(type: GraphQLNamedType): boolean;
export declare function getProviderValue(
  varName: string,
  config: Configuration,
  providedValues: Variables,
  argType?: GraphQLNamedType
): any;
export {};
