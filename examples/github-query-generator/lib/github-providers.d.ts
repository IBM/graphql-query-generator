import { ProviderMap } from 'ibm-graphql-query-generator/lib/provide-variables';
/**
 * Given a GraphQL query, run it against the GitHub API and extract the data
 */
export declare function runGitHubGraphQLQuery(query: string, gitHubAccessToken: string): Promise<unknown>;
/**
 * Scraped from https://github.com/topics
 */
export declare const topics: string[];
export declare function extractGhsaIds(data: any): any;
export declare function getProviderMap(gitHubAccessToken: string): Promise<ProviderMap>;
