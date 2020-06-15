export const config = {
  name: 'cra-serverless',
  github: {
    owner: 'nullsumme',
    repository: 'cra-serverless',
  },
  domainName: 'inator.it',
  subDomain: 'story',
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION
  },
}
