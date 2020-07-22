import { GraphQLSchema } from 'graphql';
import { Configuration } from 'ibm-graphql-query-generator';
export declare class YelpQueryGenerator {
    yelpSchema: GraphQLSchema;
    yelpQueryConfig: Configuration;
    constructor(yelpSchema: GraphQLSchema, yelpQueryConfig: Configuration);
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
export declare function getYelpQueryGenerator(yelpAccessToken: string): Promise<YelpQueryGenerator>;
