function getRandomMarketplaceSlug() {
  const slugs = [
    'chat',
    'code-quality',
    'code-review',
    'continuous-integration',
    'dependency-management',
    'deployment',
    'learning',
    'localization',
    'mobile',
    'project-management',
    'publishing',
    'recently-added',
    'security',
    'support',
    'testing',
    'utilities'
  ]
  return slugs[Math.floor(Math.random() * slugs.length)]
}

function getRandomUserLogin() {
  return 'erikwittern'
}

function getRandomLicenseKey() {
  return 'MIT'
}

function getRandomRepositoryName() {
  return 'openapi-to-graphql'
}

function getRandomValueFromArray<T>(array: T[]): T {
  return array ? array[Math.floor(Math.random() * array.length)] : undefined
}

export const GITHUB_PROVIDERS = {
  '*__*__first': 10,
  '*__codeOfConduct__key': 'citizen_code_of_conduct',
  '*__context__name': 'default',
  '*__gist__name': 'index.html',
  '*__*__number': 1,
  '*__search': {
    query: 'test',
    type: getRandomValueFromArray(['ISSUE', 'REPOSITORY', 'USER'])
  },
  '*__repository': {
    name: getRandomRepositoryName(),
    owner: getRandomUserLogin()
  },
  '*__marketplaceListing__slug': 'wakatime',
  '*__marketplaceCategory__slug': getRandomMarketplaceSlug,
  '*__user__login': getRandomUserLogin,
  '*__license__key': getRandomLicenseKey,
  '*__organization__login': 'IBM',
  '*__topic__name': 'test',
  '*__ref__qualifiedName': '/ref/head/',
  '*__refs__refPrefix': '/ref/head/',
  '*__node__id': 'abc',
  '*__nodes__ids': ['abc'],
  '*__repositoryOwner__login': getRandomUserLogin,
  '*__resource__url': 'https://github.com/ibm/openapi-to-graphql',
  '*__project__number': 1,
  Organization__team__slug: 'oasgraph-maintainers',
  '*__issue__number': 1,
  '*__issueOrPullRequest__number': 1,
  Repository__label__name: getRandomValueFromArray([
    'bug',
    'duplicate',
    'enhancement',
    'good first issue',
    'help wanted',
    'invalid',
    'question'
  ]),
  '*__pullRequest__number': 1,
  '*__release__tagName': 'v2.0.0'
}
