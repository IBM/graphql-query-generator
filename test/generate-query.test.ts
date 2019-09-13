import * as fs from 'fs'
import { buildSchema, print, validate, DocumentNode, OperationDefinitionNode, DefinitionNode, parse } from 'graphql'
import { Configuration, generateRandomQuery } from '../src/index'
import { GITHUB_PROVIDERS } from './github-providers'

// globals:
const schemaDef = fs.readFileSync('./test/fixtures/schema.graphql').toString()
const schema = buildSchema(schemaDef)

const schemaDefGitHub = fs.readFileSync('./test/fixtures/github.graphql').toString()
const schemaGitHub = buildSchema(schemaDefGitHub)

const schemaDefSimple = fs.readFileSync('./test/fixtures/simple.graphql').toString()
const schemaSimple = buildSchema(schemaDefSimple)

// helper function:
function getOperationDefinition (doc: DocumentNode) : OperationDefinitionNode {
  const opDefs : DefinitionNode[] = doc.definitions.filter(def => {
    return def.kind === 'OperationDefinition'
  })
  return opDefs[0] as OperationDefinitionNode
}

test(`Obtain random query from example schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.1,
    depthProbability: 0.1
  }

  const {queryDocument, variableValues} = generateRandomQuery(schema, config)

  // console.log(print(queryDocument))
  // console.log(variableValues)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  const opDef = getOperationDefinition(queryDocument)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  const errors = validate(schema, queryDocument)
  expect(errors).toEqual([])
})

test(`Obtain complete query from example schema`, () => {
  const config : Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    maxDepth: 2
  }

  const {queryDocument, variableValues} = generateRandomQuery(schema, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schema, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Avoid picking field with only nested subfields when approaching max depth`, () => {
  const config : Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    maxDepth: 3,
    considerInterfaces: true,
    considerUnions: true
  }

  const {queryDocument, variableValues} = generateRandomQuery(schema, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schema, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Obtain random query from GitHub schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 3
  }

  const {queryDocument, variableValues} = generateRandomQuery(schemaGitHub, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  // console.log(print(queryDocument))
  // console.log(variableValues)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Seeded query generation is deterministic`, () => {
  const config : Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 3
  }

  /**
   * Target query:
   * 
   * query RandomQuery($Query__codeOfConduct__key: String!) {
      codeOfConduct(key: $Query__codeOfConduct__key) {
        name
        url
      }
    }
   */

  const {queryDocument, variableValues} = generateRandomQuery(schemaGitHub, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
  expect(print(queryDocument).trim().split(`\n`).length).toBe(6)
  expect(print(queryDocument).includes('codeOfConduct')).toBeTruthy()
})

test(`Missing provider leads to error`, () => {
  const config : Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 3,
    providerMap: {'blub__blib__blab': 'blob'}
  }

  /**
   * Target query:
   * 
   * query RandomQuery($Query__codeOfConduct__key: String!) {
      codeOfConduct(key: $Query__codeOfConduct__key) {
        name
        url
      }
    }
   */

  expect(() => generateRandomQuery(schemaGitHub, config)).toThrowError(`No provider found for "Query__codeOfConduct__key" in blub__blib__blab. Consider applying wildcard provider with "*__*" or "*__*__*"`)
})

test(`Provide custom provider map for GitHub schema`, () => {
  const config : Configuration = {
    breadthProbability: 0.2,
    depthProbability: 0.3,
    maxDepth: 7,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    providerMap: GITHUB_PROVIDERS,
    considerInterfaces: true,
    considerUnions: true
  }

  const {queryDocument, variableValues} = generateRandomQuery(schemaGitHub, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  // console.log(print(queryDocument))
  // console.log(variableValues)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})

test(`Utilize type__field provider`, () => {
  const config : Configuration = {
    breadthProbability: 0.2,
    depthProbability: 0.3,
    maxDepth: 7,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    providerMap: GITHUB_PROVIDERS,
    considerInterfaces: true,
    considerUnions: true,
    seed: 0.2805754930509623
  }

  /**
   * Target query:
   * 
   *  query RandomQuery($Repository__releases__first: Int, $Project__columns__first: Int, $Repository__projects__first: Int, $RepositoryOwner__pinnedRepositories__first: Int, $PullRequest__assignees__first: Int, $PullRequest__
participants__first: Int, $ReactionGroup__users__first: Int, $Reactable__reactions__first: Int, $Issue__comments__first: Int, $Issue__reactions__first: Int, $Issue__timeline__first: Int, $Repository__pullRequest__number: Int!, $Query__repository__name: String!, $Query__repository__owner: String!) {
      repository(name: $Query__repository__name, owner: $Query__repository__owner) {
        releases(first: $Repository__releases__first) {
          totalCount
        }
        projects(first: $Repository__projects__first) {
          nodes {
            columns(first: $Project__columns__first) {
              pageInfo {
                hasNextPage
              }
            }
            updatedAt
            url
          }
        }
        pullRequest(number: $Repository__pullRequest__number) {
          headRepositoryOwner {
            pinnedRepositories(first: $RepositoryOwner__pinnedRepositories__first) {
              edges {
                cursor
              }
            }
            avatarUrl
            ... on User {
              bio
              companyHTML
              createdAt
              id
              isSiteAdmin
              location
              login
              updatedAt
              websiteUrl
            }
          }
          assignees(first: $PullRequest__assignees__first) {
            nodes {
              bioHTML
              isBountyHunter
              isCampusExpert
            }
          }
          headRef {
            repository {
              description
              diskUsage
              viewerHasStarred
              viewerSubscription
            }
          }
          mergeCommit {
            abbreviatedOid
            changedFiles
            deletions
            id
            treeResourcePath
            treeUrl
            url
            viewerSubscription
          }
          mergedBy {
            login
            ... on Bot {
              url
            }
          }
          participants(first: $PullRequest__participants__first) {
            totalCount
          }
          potentialMergeCommit {
            id
            messageBodyHTML
            oid
            treeResourcePath
          }
          reactionGroups {
            users(first: $ReactionGroup__users__first) {
              edges {
                node {
                  avatarUrl
                  bioHTML
                  companyHTML
                  databaseId
                  isBountyHunter
                }
                cursor
              }
            }
            subject {
              reactions(first: $Reactable__reactions__first) {
                totalCount
              }
              reactionGroups {
                users(first: $ReactionGroup__users__first) {
                  totalCount
                }
                content
                viewerHasReacted
              }
              ... on Issue {
                reactionGroups2: reactionGroups {
                  subject {
                    databaseId
                    id
                    viewerCanReact
                    ... on PullRequest {
                      additions
                      baseRefName
                      createdViaEmail
                      merged
                      mergedAt
                      resourcePath
                      viewerCanSubscribe
                    }
                    ... on IssueComment {
                      bodyHTML
                      createdViaEmail2: createdViaEmail
                      publishedAt
                      viewerCanDelete
                    }
                    ... on PullRequestReviewComment {
                      authorAssociation
                      createdAt
                      createdViaEmail3: createdViaEmail
                      databaseId2: databaseId
                      url
                    }
                  }
                }
                comments(first: $Issue__comments__first) {
                  totalCount
                }
                reactions2: reactions(first: $Issue__reactions__first) {
                  totalCount
                  viewerHasReacted
                }
                timeline(first: $Issue__timeline__first) {
                  pageInfo {
                    startCursor
                  }
                  nodes {
                    ... on UnlockedEvent {
                      id
                    }
                  }
                }
                closedAt
                id
                lastEditedAt
                publishedAt
                title
              }
            }
            viewerHasReacted
          }
          repository {
            forkCount
            hasWikiEnabled
            isLocked
            lockReason
            name
            projectsUrl
            rebaseMergeAllowed
            shortDescriptionHTML
            viewerCanSubscribe
            viewerSubscription
          }
          suggestedReviewers {
            isCommenter
          }
          authorAssociation
          baseRefName
          baseRefOid
          bodyHTML
          bodyText
          changedFiles
          mergedAt
          publishedAt
          state
          viewerCanApplySuggestion
          viewerCanSubscribe
          viewerCannotUpdateReasons
        }
        createdAt
        isArchived
        isLocked
        mergeCommitAllowed
        nameWithOwner
        pushedAt
        viewerHasStarred
      }
    }
   */

  const {queryDocument, variableValues} = generateRandomQuery(schemaGitHub, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
  expect(print(queryDocument).trim().split(`\n`).length).toBe(193)
})

test(`Provided variables are passed to providers`, () => {
  const config : Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    providerMap: {
      '*__*__name': (providedVars) => {
        if (typeof providedVars['Query__repository__owner'] === 'string') {
          return 'Two'
        }
        return 'One'
      },
      '*__*__owner': (providedVars) => {
        if (typeof providedVars['Query__repository__name'] === 'string') {
          return 'Two'
        }
        return 'One'
      }
    }
  }

  const {queryDocument, variableValues} = generateRandomQuery(schemaSimple, config)
  const errors = validate(schemaSimple, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(errors).toEqual([])
  expect(variableValues['Query__repository__name'] != variableValues['Query__repository__owner']).toBeTruthy()
})

test(`Counts are as expected`, () => {
  const config : Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 5
  }

  /**
   * Target query:
   * 
   * query RandomQuery($Query__codeOfConduct__key: String!) {
      codeOfConduct(key: $Query__codeOfConduct__key) {
        name
        url
      }
    }
   */

  const {queryDocument, variableValues, typeCount, resolveCount, seed} = generateRandomQuery(schemaGitHub, config)
  // console.log(typeCount, resolveCount, seed)
  // console.log(print(queryDocument))
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length)
    .toEqual(Object.keys(variableValues).length)
  expect(errors).toEqual([])
})
