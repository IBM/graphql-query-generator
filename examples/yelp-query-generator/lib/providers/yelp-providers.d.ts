import { ProviderMap } from "graphql-query-generator/lib/provide-variables";
export declare function runYelpGraphQLQuery(query: any): Promise<unknown>;
export declare function getBusinessesQuery(location: string): string;
export declare const eventsQuery =
  "{\n  event_search(limit: 50) {\n    events {\n      id\n    }\n  }\n}";
export declare const locations: string[];
declare type Business = {
  id: string;
  name: string;
  phone: string;
  location: {
    address1: string;
    city: string;
    state: string;
    country: string;
  };
};
export declare function extractBusinesses(data: any): Business[];
export declare function getProviderMap(): Promise<ProviderMap>;
export {};
