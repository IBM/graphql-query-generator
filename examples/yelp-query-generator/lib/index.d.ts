import { GraphQLSchema } from "graphql";
import { Configuration } from "graphql-query-generator";
declare class YelpQueryGenerator {
  yelpSchema: GraphQLSchema;
  yelpQueryConfig: Configuration;
  constructor(yelpSchema: any, yelpQueryConfig: any);
  generateRandomYelpQuery(): {
    queryDocument: import("graphql").DocumentNode;
    variableValues: {
      [varName: string]: any;
    };
    seed: number;
    typeCount: number;
    resolveCount: number;
  };
}
export declare function getYelpQueryGenerator(): Promise<YelpQueryGenerator>;
export {};
