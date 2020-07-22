import * as fetch from 'node-fetch'

import { ProviderMap } from 'ibm-graphql-query-generator/lib/provide-variables'
import { matchVarName } from 'ibm-graphql-query-generator'

/**
 * Given a GraphQL query, run it against the GitHub API and extract the data
 */
export function runGitHubGraphQLQuery (kind: 'graphql' | 'json', query: string, gitHubAccessToken: string) {
  return new Promise((resolve, reject) => {
    fetch
      .default('https://api.github.com/graphql', {
        method: 'POST',
        body: query,
        headers: {
          Authorization: `Bearer ${gitHubAccessToken}`
        }
      })
      .then((res) => {
        if (res.status === 200) {
          return res.json()
        } else if (res.status === 401) {
          throw new Error(
            'Unauthorized GitHub API call. Did you provide a valid GitHub access token?'
          )
        } else {
          throw new Error('Unsuccessful GitHub API call.')
        }
      })
      .then((json: any) => {
        if ('errors' in json) {
          const insufficientScopesError = (json.errors as any[]).find(
            (error) => error.type === 'INSUFFICIENT_SCOPES'
          )
          if (insufficientScopesError) {
            throw new Error(
              `GitHub access token has insufficient scopes. + ${insufficientScopesError.message}`
            )
          }
          console.error(`Errors in response: ${JSON.stringify(json.errors)}`);
        }
        resolve(json.data)
      })
      .catch(reject)
  })
}

/**
 * GraphQL query used to extract the marketplace category slugs from the GitHub
 * API
 */
const marketplaceCategorySlugsQuery = `{
  marketplaceCategories {
    slug
  }
}`

/**
 * GraphQL query used to extract the marketplace listing slugs from the GitHub
 * API
 */
const marketplaceListingSlugsQuery = `{
  marketplaceListings(first: 100) {
    nodes {
      app {
        slug
      }
    }
  }
}`

/**
 * GraphQL query used to extract the license keys from the GitHub
 * API
 */
const licenseKeysQuery = `{
  licenses {
    key
  }
}`

/**
 * GraphQL query used to extract the code of conduct keys from the GitHub
 * API
 */
const codeOfConductKeysQuery = `{
  codesOfConduct {
    key
  }
}`

/**
 * GraphQL query used to extract the GHSA IDs from the GitHub
 * API
 */
const ghsaIdsQuery = `{ 
	securityAdvisories(first: 100) {
    nodes {
      ghsaId
    }
  }
}`

/**
 * GraphQL query used to extract reposfrom the GitHub
 * API
 */
const reposQuery = `{
  search (query: "stars: >1", type: REPOSITORY, first: 100) {
      nodes {
        ...on Repository {
          name
          owner {
            ...on User {
              userlogin: login
            }
            ...on Organization {
              organization: login
            }
        }
      }
    }
  }
}`

/**
 * Default labels taken from https://help.github.com/articles/about-labels/
 */
const labels = [
  'bug',
  'duplicate',
  'enhancement',
  'good first issue',
  'help wanted',
  'invalid',
  'question',
  'wontfix'
]

/**
 * Release tag names are typically versions
 *
 * https://developer.github.com/v3/git/tags/
 */
const tagNames = ['v0.0.1', 'v1.0.0', 'v2.0.0', 'v3.0.0']

/**
 * Examples provided at: https://developer.github.com/v4/object/ref/
 */
const refs = ['refs/heads/', 'refs/tags/']

/**
 * Examples provided at: https://developer.github.com/v3/git/refs/
 */
const qualifiedNames = ['refs/heads/master', 'refs/tags/master']

/**
 * Scraped from https://github.com/topics
 */
export const topics = [
  '3d',
  'ajax',
  'algorithm',
  'amphp',
  'android',
  'angular',
  'ansible',
  'api',
  'arduino',
  'aspnet',
  'atom',
  'awesome',
  'aws',
  'azure',
  'babel',
  'bash',
  'bitcoin',
  'blockchain',
  'bootstrap',
  'bot',
  'c',
  'chrome',
  'chrome-extension',
  'cli',
  'clojure',
  'code-quality',
  'code-review',
  'compiler',
  'continuous-integration',
  'cpp',
  'cryptocurrency',
  'crystal',
  'csharp',
  'css',
  'data-structures',
  'data-visualization',
  'database',
  'deep-learning',
  'dependency-management',
  'deployment',
  'django',
  'docker',
  'documentation',
  'dotnet',
  'electron',
  'elixir',
  'emacs',
  'ember',
  'emoji',
  'emulator',
  'es6',
  'eslint',
  'ethereum',
  'express',
  'firebase',
  'firefox',
  'flask',
  'font',
  'framework',
  'frontend',
  'game-engine',
  'git',
  'github-api',
  'go',
  'google',
  'gradle',
  'graphql',
  'gulp',
  'haskell',
  'homebrew',
  'homebridge',
  'html',
  'http',
  'icon-font',
  'ios',
  'ipfs',
  'java',
  'javascript',
  'jekyll',
  'jquery',
  'json',
  'julia',
  'jupyter-notebook',
  'koa',
  'kotlin',
  'kubernetes',
  'laravel',
  'latex',
  'library',
  'linux',
  'localization',
  'lua',
  'machine-learning',
  'macos',
  'markdown',
  'mastodon',
  'material-design',
  'matlab',
  'maven',
  'minecraft',
  'mobile',
  'monero',
  'mongodb',
  'mongoose',
  'monitoring',
  'mvvmcross',
  'mysql',
  'nativescript',
  'nim',
  'nlp',
  'nodejs',
  'nosql',
  'npm',
  'objective-c',
  'opengl',
  'operating-system',
  'p2p',
  'package-manager',
  'parsing',
  'perl',
  'perl6',
  'phaser',
  'php',
  'pico-8',
  'pixel-art',
  'postgresql',
  'project-management',
  'publishing',
  'pwa',
  'python',
  'qt',
  'r',
  'rails',
  'raspberry-pi',
  'ratchet',
  'react',
  'react-native',
  'reactiveui',
  'redux',
  'rest-api',
  'ruby',
  'rust',
  'sass',
  'scala',
  'scikit-learn',
  'sdn',
  'security',
  'server',
  'serverless',
  'shell',
  'sketch',
  'spacevim',
  'spring-boot',
  'sql',
  'storybook',
  'support',
  'swift',
  'symfony',
  'telegram',
  'tensorflow',
  'terminal',
  'terraform',
  'testing',
  'twitter',
  'typescript',
  'ubuntu',
  'unity',
  'unreal-engine',
  'vagrant',
  'vim',
  'virtual-reality',
  'vue',
  'wagtail',
  'web-components',
  'webapp',
  'webpack',
  'windows',
  'wordplate',
  'wordpress',
  'xamarin',
  'xml'
]

/**
 * Standard Normal variate using Box-Muller transform.
 *
 * See: https://stackoverflow.com/a/49434653/12357477
 */
function randomBm (): number {
  let u = 0,
    v = 0
  while (u === 0) u = Math.random() // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random()
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  num = num / 10.0 + 0.5 // Translate to 0 -> 1
  if (num > 1 || num < 0) return randomBm() // Resample between 0 and 1
  return num
}

/**
 * Returns random integer, normally distributed around 10
 */
function getRandomInt () {
  return Math.floor(10 * randomBm())
}

function extractMarketplaceCategorySlugs (data: any) {
  return data.marketplaceCategories.map((category: any) => {
    return category.slug
  })
}

function extractMarketplaceListingSlugs (data: any) {
  const result: string[] = []
  data.marketplaceListings.nodes.forEach((node: any) => {
    if (node.app && typeof node.app.slug === 'string') {
      result.push(node.app.slug)
    }
  })
  return result
}

function extractLicenseKeys (data: any) {
  return data.licenses.map((license: any) => {
    return license.key
  })
}

function extractCodeOfConductKeys (data: any) {
  return data.codesOfConduct.map((code: any) => {
    return code.key
  })
}

function getRandomLabelName () {
  return labels[Math.floor(Math.random() * labels.length)]
}

function getRandomTagName () {
  return tagNames[Math.floor(Math.random() * tagNames.length)]
}

function getRandomRefPrefix () {
  return refs[Math.floor(Math.random() * refs.length)]
}

function getRandomQualifiedName () {
  return qualifiedNames[Math.floor(Math.random() * qualifiedNames.length)]
}

function getRandomTopic () {
  return topics[Math.floor(Math.random() * topics.length)]
}

export function extractGhsaIds (data: any) {
  return data.securityAdvisories.nodes.map((node: any) => {
    return node.ghsaId
  })
}

type UserRepo = {
  userlogin: string
  repository: string
}

type OrgRepo = {
  organization: string
  repository: string
}

function extractRepos (data: any) {
  const userRepos: UserRepo[] = []
  const orgRepos: OrgRepo[] = []
  const allRepos: (UserRepo | OrgRepo)[] = []

  data.search.nodes.forEach((node: any) => {
    if ('userlogin' in node.owner) {
      const repo = {
        userlogin: node.owner.userlogin,
        repository: node.name
      }

      userRepos.push(repo)
      allRepos.push(repo)
    } else {
      const repo = {
        organization: node.owner.organization,
        repository: node.name
      }

      orgRepos.push(repo)
      allRepos.push(repo)
    }
  })

  return {
    userRepos,
    orgRepos,
    allRepos
  }
}

export function getProviderMap (gitHubAccessToken: string) {
  return new Promise<ProviderMap>((resolve, reject) => {
    const marketplaceCategorySlugsPromise = new Promise<string[]>(
      (resolve, reject) => {
        runGitHubGraphQLQuery(
          'graphql',
          JSON.stringify({ query: marketplaceCategorySlugsQuery }),
          gitHubAccessToken
        ).then(
          (data) => {
            resolve(extractMarketplaceCategorySlugs(data))
          },
          (error) => {
            reject(`Could not fetch marketplace categories slugs. ${error}`)
          }
        )
      }
    )

    const marketplaceListingSlugsPromise = new Promise<string[]>(
      (resolve, reject) => {
        runGitHubGraphQLQuery(
          'graphql',
          JSON.stringify({ query: marketplaceListingSlugsQuery }),
          gitHubAccessToken
        ).then(
          (data) => {
            resolve(extractMarketplaceListingSlugs(data))
          },
          (error) => {
            reject(`Could not fetch marketplace listings slugs. ${error}`)
          }
        )
      }
    )

    const licenseKeysPromise = new Promise<string[]>((resolve, reject) => {
      runGitHubGraphQLQuery('graphql',
        JSON.stringify({ query: licenseKeysQuery }), gitHubAccessToken)
        .then(
          (data) => {
            resolve(extractLicenseKeys(data))
          },
          (error) => {
            reject(`Could not fetch license keys. ${error}`)
          }
        )
    })

    const codeOfConductKeysPromise = new Promise<string[]>(
      (resolve, reject) => {
        runGitHubGraphQLQuery('graphql',
          JSON.stringify({ query: codeOfConductKeysQuery }), gitHubAccessToken)
          .then(
            (data) => {
              resolve(extractCodeOfConductKeys(data))
            },
            (error) => {
              reject(`Could not fetch code of conduct keys. ${error}`)
            }
          )
      }
    )

    const ghsaIdsPromise = new Promise<string[]>((resolve, reject) => {
      runGitHubGraphQLQuery('graphql',
        JSON.stringify({ query: ghsaIdsQuery }), gitHubAccessToken)
        .then(
          (data) => {
            resolve(extractGhsaIds(data))
          },
          (error) => {
            reject(`Could not fetch GHSA IDs. ${error}`)
          }
        )
    })

    const reposPromise = new Promise<{
      userRepos: UserRepo[]
      orgRepos: OrgRepo[]
      allRepos: (UserRepo | OrgRepo)[]
    }>((resolve, reject) => {
      runGitHubGraphQLQuery('graphql',
        JSON.stringify({ query: reposQuery }), gitHubAccessToken)
        .then(
          (data) => {
            resolve(extractRepos(data))
          },
          (error) => {
            reject(`Could not fetch repos. ${error}`)
          }
        )
    })

    Promise.all([
      marketplaceCategorySlugsPromise,
      marketplaceListingSlugsPromise,
      licenseKeysPromise,
      codeOfConductKeysPromise,
      ghsaIdsPromise,
      reposPromise
    ]).then((values) => {
      const [
        marketplaceCategorySlugs,
        marketplaceListingSlugs,
        licenseKeys,
        codeOfConductKeys,
        ghsaIds,
        repos
      ] = values

      const { userRepos, orgRepos, allRepos } = repos

      function getRandomMarketplaceCategorySlug () {
        return marketplaceCategorySlugs[
          Math.floor(Math.random() * marketplaceCategorySlugs.length)
        ]
      }

      function getRandomMarketplaceListingSlug () {
        return marketplaceListingSlugs[
          Math.floor(Math.random() * marketplaceListingSlugs.length)
        ]
      }

      function getRandomLicenseKey () {
        return licenseKeys[Math.floor(Math.random() * licenseKeys.length)]
      }

      function getRandomCodeOfConductKey () {
        return codeOfConductKeys[
          Math.floor(Math.random() * codeOfConductKeys.length)
        ]
      }

      function getRandomGhsaId () {
        return ghsaIds[Math.floor(Math.random() * ghsaIds.length)]
      }

      function getRandomUserLogin (existingVars: any) {
        // If there is already repository in the variables, return matching user:
        const repoVarKey = matchVarName(
          '*__repository__name',
          Object.keys(existingVars)
        )
        if (repoVarKey) {
          const repository = existingVars[repoVarKey]
          const userPair = userRepos.find(
            (repo) => repo.repository === repository
          )
          if (typeof userPair === 'object') {
            return userPair.userlogin
          }
        }
        return userRepos[Math.floor(Math.random() * userRepos.length)].userlogin
      }

      function getRandomOrganizationLogin (existingVars: any) {
        // if there is already repository in the variables, return matching user:
        const repoVarKey = matchVarName(
          '*__repository__name',
          Object.keys(existingVars)
        )
        if (repoVarKey) {
          const repository = existingVars[repoVarKey]
          const orgPair = orgRepos.find(
            (repo) => repo.repository === repository
          )
          if (typeof orgPair === 'object') {
            return orgPair.organization
          }
        }
        return orgRepos[Math.floor(Math.random() * orgRepos.length)]
          .organization
      }

      function getRandomOwner (existingVars: any) {
        // If there is already a repository, return matching owner:
        const repoKey = matchVarName(
          '*__repository__name',
          Object.keys(existingVars)
        )
        if (repoKey) {
          const existingRepo = existingVars[repoKey]
          const pair = allRepos.find((repo) => repo.repository === existingRepo)

          if (pair) {
            if ('organization' in pair) {
              return pair.organization
            } else if ('userlogin' in pair) {
              return pair.userlogin
            }
          }
        }

        const pair = allRepos[Math.floor(Math.random() * allRepos.length)]
        if ('organization' in pair) {
          return pair.organization
        } else if ('userlogin' in pair) {
          return pair.userlogin
        }
      }

      function getRandomRepositoryName (existingVars: any) {
        // If there is already a user login in the variables, return matching repository:
        const userLoginKey = matchVarName(
          '*__user__login',
          Object.keys(existingVars)
        )
        if (userLoginKey) {
          const userLogin = existingVars[userLoginKey]

          const userRepo = userRepos.find(
            (repo) => repo.userlogin === userLogin
          )

          return userRepo ? userRepo.repository : undefined
        }
        // If there is already an organization in the variables, return matching repository:
        const organizationKey = matchVarName(
          '*__organization__login',
          Object.keys(existingVars)
        )
        if (organizationKey) {
          const organization = existingVars[organizationKey]

          const orgRepo = orgRepos.find(
            (repo) => repo.organization === organization
          )

          return orgRepo ? orgRepo.repository : undefined
        }
        // If there is already an owner in the variables, return matching repository:
        const ownerKey = matchVarName(
          '*__repository__owner',
          Object.keys(existingVars)
        )
        if (ownerKey) {
          const owner = existingVars[ownerKey]

          const repo = allRepos.find(
            (repo) =>
              (repo as UserRepo).userlogin === owner ||
              (repo as OrgRepo).organization === owner
          )

          return repo ? repo.repository : undefined
        }
        return allRepos[Math.floor(Math.random() * allRepos.length)].repository
      }

      resolve({
        /**
         * Given we don't know anything about the repo, we return 'README.md',
         * which is (likely) common across repositories.
         */
        '*__blame__path': 'README.md',

        /**
         * Most likely "default" according to https://developer.github.com/v3/repos/statuses/
         */
        '*__context__name': 'default',

        '*__*__first': getRandomInt,
        '*__*__number': getRandomInt,
        '*__codeOfConduct__key': getRandomCodeOfConductKey,
        '*__gist__name': 'index.html',
        '*__label__name': getRandomLabelName,
        '*__license__key': getRandomLicenseKey,
        '*__marketplaceListing__slug': getRandomMarketplaceListingSlug,
        '*__marketplaceCategory__slug': getRandomMarketplaceCategorySlug,
        '*__organization__login': getRandomOrganizationLogin,
        '*__refs__refPrefix': getRandomRefPrefix,
        '*__ref__qualifiedName': getRandomQualifiedName,
        '*__release__tagName': getRandomTagName,
        '*__repository__name': getRandomRepositoryName,
        '*__repository__owner': getRandomOwner,
        '*__search__query': 'test',
        '*__team__slug': 'team',
        '*__topic__name': getRandomTopic,
        '*__user__login': getRandomUserLogin,
        '*__repositoryowner__login': getRandomOwner,
        '*__securityAdvisory__ghsaId': getRandomGhsaId,
        '*__*__maxRepositories': getRandomInt
      })
    })
  })
}
