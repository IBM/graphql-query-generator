import * as dotenv from 'dotenv';
dotenv.config();

import { print, DocumentNode } from 'graphql';
import * as fs from 'fs';

import { GitHubQueryGenerator, getGitHubQueryGenerator } from './index';
import { runGitHubGraphQLQuery } from './github-providers';


// The number of randomly generated queries that should be created
const ITERATIONS = 3;
const withResponse = true;

function iterate (f: (i: number) => Promise<void>, n: number): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) {
    p = p.then(_ => { return f(i) })
  }
  return p;
}

function delay (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// function repeatUtilSuccess<T> (f: () => T): T {
//   try {
//     return f();
//   } catch (error) {
//     return repeatUtilSuccess(f);
//   }
// }

// function genQuery (queryGenerator: GitHubQueryGenerator): {
//   queryDocument: DocumentNode;
//   variableValues: { [varName: string]: any; }
// } {
//   try {
//     return queryGenerator.generateRandomGitHubQuery();
//   } catch (error) {
//     console.log(error);
//     return genQuery(queryGenerator);
//   }
// }

async function getEntry (token: string, queryGenerator: GitHubQueryGenerator, id: number, fd: number) {
  try {
    // const { queryDocument, variableValues } = repeatUtilSuccess(queryGenerator.generateRandomGitHubQuery);
    // const { queryDocument, variableValues } = genQuery(queryGenerator);
    const { queryDocument, variableValues } = queryGenerator.generateRandomGitHubQuery();
    const query = print(queryDocument);
    const request = { query, variables: variableValues }
    await delay(1000);
    const response = withResponse ? await runGitHubGraphQLQuery('json', JSON.stringify(request), token) : null
    const entry = {
      id,
      query,
      variableValues,
      response
    }
    console.log(`Generated query ${id} out of ${ITERATIONS}`);
    fs.write(fd, `${JSON.stringify(entry, null, 2)},\n`, (err) => {
      if (err) console.log('Error writing file:', err)
    });
  } catch (error) {
    console.log(`Error while generating query ${id}: ${error}`);
    await getEntry(token, queryGenerator, id, fd)
  }
}

if (process.env.GITHUB_ACCESS_TOKEN) {
  getGitHubQueryGenerator(process.env.GITHUB_ACCESS_TOKEN).then(
    (queryGenerator) => {
      const token = process.env.GITHUB_ACCESS_TOKEN || '';
      const fd = fs.openSync('./query-corpus/github-query.json', 'w');
      iterate(i => getEntry(token, queryGenerator, i, fd), ITERATIONS).then(
        () => {
          fs.close(fd, (err) => {
            if (err) console.log('Error closing file:', err)
          });
          console.log('Finished generating query corpus');
        })
        .catch(err => {
          console.log('Finished generating query corpus with error' + err);
        });
    }
  );
} else {
  console.log('Please provide a GitHub access token');
}
