import * as fs from 'fs'
import {
  buildSchema,
  print,
  validate,
  DocumentNode,
  OperationDefinitionNode,
  DefinitionNode
} from 'graphql'
import { Configuration, generateRandomQuery } from '../src/index'
import { GITHUB_PROVIDERS } from './github-providers'
import * as dedent from 'dedent'

// Globals
const schemaDef = fs.readFileSync('./test/fixtures/schema.graphql').toString()
const schema = buildSchema(schemaDef)

const schemaDefGitHub = fs
  .readFileSync('./test/fixtures/github.graphql')
  .toString()
const schemaGitHub = buildSchema(schemaDefGitHub)

const schemaDefSimple = fs
  .readFileSync('./test/fixtures/simple.graphql')
  .toString()
const schemaSimple = buildSchema(schemaDefSimple)

function getOperationDefinition(doc: DocumentNode): OperationDefinitionNode {
  const opDefs: DefinitionNode[] = doc.definitions.filter((def) => {
    return def.kind === 'OperationDefinition'
  })
  return opDefs[0] as OperationDefinitionNode
}

test(`Obtain random query from example schema`, () => {
  const config: Configuration = {
    breadthProbability: 0.1,
    depthProbability: 0.1,
    providePlaceholders: true
  }

  const { queryDocument, variableValues } = generateRandomQuery(schema, config)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  const opDef = getOperationDefinition(queryDocument)
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  const errors = validate(schema, queryDocument)
  expect(errors).toEqual([])
})

test(`Obtain complete query from example schema`, () => {
  const config: Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    maxDepth: 2,
    providePlaceholders: true
  }

  const { queryDocument, variableValues } = generateRandomQuery(schema, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schema, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
})

test(`Avoid picking field with only nested subfields when approaching max depth`, () => {
  const config: Configuration = {
    breadthProbability: 1,
    depthProbability: 1,
    maxDepth: 3,
    considerInterfaces: true,
    considerUnions: true,
    providePlaceholders: true
  }

  const { queryDocument, variableValues } = generateRandomQuery(schema, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schema, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
})

test(`Obtain random query from GitHub schema`, () => {
  const config: Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 3,
    providePlaceholders: true
  }

  const { queryDocument, variableValues } = generateRandomQuery(
    schemaGitHub,
    config
  )
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument).replace(/\s/g, '')).toEqual(
    `query RandomQuery($Query__codeOfConduct__key: String!) {
    codeOfConduct(key: $Query__codeOfConduct__key) {
      name
      url
    }
  }`.replace(/\s/g, '')
  )
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
})

test(`Seeded query generation is deterministic`, () => {
  const config: Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 3,
    providePlaceholders: true
  }

  const { queryDocument, variableValues } = generateRandomQuery(
    schemaGitHub,
    config
  )
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument).replace(/\s/g, '')).toEqual(
    `query RandomQuery($Query__codeOfConduct__key: String!) {
    codeOfConduct(key: $Query__codeOfConduct__key) {
      name
      url
    }
  }`.replace(/\s/g, '')
  )
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
})

test(`Missing provider leads to error`, () => {
  const config: Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 3,
    providerMap: { blub__blib__blab: 'blob' }
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

  expect(() => generateRandomQuery(schemaGitHub, config)).toThrowError(
    `Missing provider for non-null variable "Query__codeOfConduct__key" of type "String!". Either add a provider (e.g., using a wildcard "*__*" or "*__*__*"), or set providePlaceholders configuration option to true.`
  )
})

test(`Null providers are allowed`, () => {
  const config: Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 3,
    providerMap: { '*__*__*': null }
  }

  const { queryDocument, variableValues } = generateRandomQuery(
    schemaGitHub,
    config
  )
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument).replace(/\s/g, '')).toEqual(
    `query RandomQuery($Query__codeOfConduct__key: String!) {
    codeOfConduct(key: $Query__codeOfConduct__key) {
      name
      url
    }
  }`.replace(/\s/g, '')
  )
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
})

test(`Provide custom provider map for GitHub schema`, () => {
  const config: Configuration = {
    breadthProbability: 0.2,
    depthProbability: 0.3,
    maxDepth: 7,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    providerMap: GITHUB_PROVIDERS,
    considerInterfaces: true,
    considerUnions: true
  }

  const { queryDocument, variableValues } = generateRandomQuery(
    schemaGitHub,
    config
  )
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument) === '').toEqual(false)
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
})

test(`Utilize type__field provider`, () => {
  const config: Configuration = {
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

  const { queryDocument, variableValues } = generateRandomQuery(
    schemaGitHub,
    config
  )
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument).replace(/\s/g, '')).toEqual(
    `query RandomQuery($Repository__releases__first: Int, $Project__columns__first: Int, $Repository__projects__first: Int, $RepositoryOwner__pinnedRepositories__first: Int, $PullRequest_
  _assignees__first: Int, $User__publicKeys__first: Int, $User__commitComments__first: Int, $User__organization__login: String!, $User__pullRequests__first: Int, $User__starredRepositories__
  first: Int, $User__watching__first: Int, $PullRequest__participants__first: Int, $Repository__deployKeys__first: Int, $Repository__assignableUsers__first: Int, $Repository__collaborators__
  first: Int, $Repository__issueOrPullRequest__number: Int!, $PullRequest__comments__first: Int, $PullRequest__labels__first: Int, $Repository__pullRequest__number: Int!, $Query__repository_
  _name: String!, $Query__repository__owner: String!) {
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
          ... on User {
            isCampusExpert
            viewerCanFollow
          }
        }
        participants(first: $PullRequest__participants__first) {
          nodes {
            publicKeys(first: $User__publicKeys__first) {
              pageInfo {
                hasNextPage
              }
            }
            commitComments(first: $User__commitComments__first) {
              totalCount
            }
            organization(login: $User__organization__login) {
              databaseId
              id
              location
              newTeamUrl
              resourcePath
              viewerCanAdminister
            }
            pullRequests(first: $User__pullRequests__first) {
              nodes {
                baseRefOid
                changedFiles
                closedAt
                databaseId
                headRefOid
                revertUrl
                state
                title
                updatedAt
                viewerCanApplySuggestion
                viewerCanReact
                viewerCanUpdate
                viewerCannotUpdateReasons
                viewerSubscription
              }
              edges {
                cursor
              }
            }
            starredRepositories(first: $User__starredRepositories__first) {
              pageInfo {
                endCursor
              }
            }
            watching(first: $User__watching__first) {
              nodes {
                hasIssuesEnabled
                hasWikiEnabled
                isFork
                projectsResourcePath
                updatedAt
                viewerCanCreateProjects
                viewerSubscription
              }
            }
            avatarUrl
            company
            createdAt
            email
            isBountyHunter
            isEmployee
          }
          pageInfo {
            hasPreviousPage
          }
        }
        potentialMergeCommit {
          authoredDate
          committedDate
          committedViaWeb
          deletions
          treeUrl
        }
        reactionGroups {
          createdAt
        }
        repository {
          deployKeys(first: $Repository__deployKeys__first) {
            edges {
              node {
                verified
              }
            }
          }
          assignableUsers(first: $Repository__assignableUsers__first) {
            nodes {
              company
              email
              isCampusExpert
              isDeveloperProgramMember
              isSiteAdmin
              resourcePath
            }
          }
          collaborators(first: $Repository__collaborators__first) {
            pageInfo {
              endCursor
            }
            nodes {
              bioHTML
              databaseId
              isHireable
            }
            totalCount
          }
          issueOrPullRequest(number: $Repository__issueOrPullRequest__number) {
            ... on Issue {
              bodyHTML
              id
            }
          }
          pullRequest(number: $Repository__pullRequest__number) {
            comments(first: $PullRequest__comments__first) {
              pageInfo {
                startCursor
              }
            }
            editor {
              avatarUrl
              ... on Bot {
                createdAt
              }
            }
            labels(first: $PullRequest__labels__first) {
              totalCount
            }
            milestone {
              url
            }
            activeLockReason
            body
            createdViaEmail
            headRefOid
            number
            permalink
            viewerCanReact
            viewerDidAuthor
          }
          descriptionHTML
          forkCount
          isArchived
          isMirror
          mergeCommitAllowed
          nameWithOwner
          projectsUrl
          rebaseMergeAllowed
          viewerCanAdminister
          viewerHasStarred
        }
        suggestedReviewers {
          reviewer {
            avatarUrl
            isBountyHunter
            isEmployee
            isSiteAdmin
          }
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
  }`.replace(/\s/g, '')
  )

  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
  expect(print(queryDocument).trim().split(`\n`).length).toBe(247)
})

test(`Provided variables are passed to providers`, () => {
  const config: Configuration = {
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

  const { queryDocument, variableValues } = generateRandomQuery(
    schemaSimple,
    config
  )
  const errors = validate(schemaSimple, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument).replace(/\s/g, '')).toEqual(
    `query RandomQuery($Query__repository__name: String!, $Query__repository__owner: String!) {
    name
    repository(name: $Query__repository__name, owner: $Query__repository__owner)
  }`.replace(/\s/g, '')
  )
  expect(errors).toEqual([])
  expect(
    variableValues['Query__repository__name'] !=
      variableValues['Query__repository__owner']
  ).toBeTruthy()
})

test(`Counts are as expected`, () => {
  const config: Configuration = {
    breadthProbability: 0.5,
    depthProbability: 0.5,
    maxDepth: 10,
    ignoreOptionalArguments: true,
    argumentsToConsider: ['first'],
    considerInterfaces: true,
    considerUnions: true,
    seed: 5
  }

  const {
    queryDocument,
    variableValues,
    typeCount,
    resolveCount,
    seed
  } = generateRandomQuery(schemaGitHub, config)
  const opDef = getOperationDefinition(queryDocument)
  const errors = validate(schemaGitHub, queryDocument)

  expect(queryDocument).toBeDefined()
  expect(print(queryDocument).replace(/\s/g, '')).toEqual(
    `query RandomQuery($Query__marketplaceListings__first: Int) {
    marketplaceListings(first: $Query__marketplaceListings__first) {
      edges {
        node {
          secondaryCategory {
            description
            howItWorks
            primaryListingCount
            resourcePath
            secondaryListingCount
            url
          }
          app {
            databaseId
            id
            logoBackgroundColor
            slug
            url
          }
          configurationUrl
          extendedDescription
          extendedDescriptionHTML
          fullDescriptionHTML
          hasApprovalBeenRequested
          howItWorks
          howItWorksHTML
          installedForViewer
          isApproved
          isDelisted
          isPaid
          logoUrl
          name
          normalizedShortDescription
          resourcePath
          slug
          statusUrl
          supportUrl
          url
          viewerCanDelist
          viewerCanEditCategories
          viewerCanEditPlans
          viewerCanReject
          viewerHasPurchasedForAllOrganizations
        }
        cursor
      }
    }
  }`.replace(/\s/g, '')
  )
  expect(Object.keys(opDef.variableDefinitions).length).toEqual(
    Object.keys(variableValues).length
  )
  expect(errors).toEqual([])
})

test('Use providePlaceholders option', () => {
  const schema = buildSchema(`
    scalar Custom

    type Query {
      field (user: String!, active: Boolean!, age: Int, worth: Float, id: ID, custom: Custom): String
    }
  `)
  const config = {
    seed: 1,
    providePlaceholders: true,
    ignoreOptionalArguments: false
  }
  const { queryDocument, variableValues } = generateRandomQuery(schema, config)
  const query = print(queryDocument)
  expect(print(queryDocument).replace(/\s/g, '')).toEqual(
    `
    query RandomQuery(
      $Query__field__user: String!,
      $Query__field__active: Boolean!,
      $Query__field__age: Int,
      $Query__field__worth: Float,
      $Query__field__id: ID,
      $Query__field__custom: Custom) {
      field(
        user:   $Query__field__user,
        active: $Query__field__active,
        age:    $Query__field__age,
        worth:  $Query__field__worth,
        id:     $Query__field__id,
        custom: $Query__field__custom)
    }`.replace(/\s/g, '')
  )
  const variables = JSON.stringify(variableValues, null, 2)
  expect(variables.trim()).toEqual(
    dedent(`
      {
        "Query__field__user": "PLACEHOLDER",
        "Query__field__active": true,
        "Query__field__age": 10,
        "Query__field__worth": 10,
        "Query__field__id": "PLACEHOLDER",
        "Query__field__custom": "PLACEHOLDER"
      }
    `).trim()
  )
})
