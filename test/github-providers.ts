function getRandomMarketplaceSlug () {
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

function getRandomUserLogin () {
  // TODO: return random user
  return 'erikwittern'
}

function getRandomLicenseKey () {
  // TODO: return random license key
  return 'MIT'
}

function getRandomRepositoryName () {
  // TODO
  return 'oasgraph'
}

export const GITHUB_PROVIDERS = {
  '*__*__first': 10,
  '*__codeOfConduct__key': 'citizen_code_of_conduct', // or 'contributor_covenant'
  '*__gist__name': 'index.html',
  '*__*__number': 1,
  '*__search__query': 'test',
  '*__repository__name': getRandomRepositoryName,
  '*__marketplaceListing__slug': 'wakatime', // see 'https://github.com/marketplace',
  '*__marketplaceCategory__slug': getRandomMarketplaceSlug,
  '*__user__login': getRandomUserLogin,
  '*__repository__owner': getRandomUserLogin,
  '*__license__key': getRandomLicenseKey,
  '*__organization__login': 'Facebook'
}
