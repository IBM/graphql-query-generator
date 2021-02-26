"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
dotenv.config();
const graphql_1 = require("graphql");
const fs = require("fs");
const index_1 = require("./index");
const github_providers_1 = require("./github-providers");
// The number of randomly generated queries that should be created
const ITERATIONS = 5;
// Execute the query to get the response
const withResponse = true;
function iterate(f, n) {
    let p = Promise.resolve();
    for (let i = 0; i < n; i++) {
        p = p.then((_) => {
            return f(i);
        });
    }
    return p;
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function getEntry(token, queryGenerator, id, fd) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { queryDocument, variableValues } = queryGenerator.generateRandomGitHubQuery();
            const query = graphql_1.print(queryDocument);
            const request = { query, variables: variableValues };
            yield delay(1000);
            const data = withResponse
                ? yield github_providers_1.runGitHubGraphQLQuery(JSON.stringify(request), token)
                : null;
            const timestamp = Date.now();
            const entry = {
                id,
                timestamp,
                query,
                variableValues,
                response: { data }
            };
            console.log(`Generated query ${id + 1} out of ${ITERATIONS}`);
            fs.write(fd, `${JSON.stringify(entry, null, 2)}${id < ITERATIONS - 1 ? ',' : ''}\n`, (err) => {
                if (err)
                    console.log('Error writing file:', err);
            });
        }
        catch (error) {
            console.log(`Error while generating query ${id}: ${error}`);
            yield getEntry(token, queryGenerator, id, fd);
        }
    });
}
if (process.env.GITHUB_ACCESS_TOKEN) {
    index_1.getGitHubQueryGenerator(process.env.GITHUB_ACCESS_TOKEN).then((queryGenerator) => {
        const token = process.env.GITHUB_ACCESS_TOKEN || '';
        const fd = fs.openSync('./query-corpus/github-query.json', 'w');
        fs.write(fd, `[\n`, (err) => {
            if (err)
                console.log('Error writing file:', err);
        });
        iterate((i) => getEntry(token, queryGenerator, i, fd), ITERATIONS)
            .then(() => {
            fs.write(fd, `]\n`, (err) => {
                if (err)
                    console.log('Error writing file:', err);
            });
            fs.close(fd, (err) => {
                if (err)
                    console.log('Error closing file:', err);
            });
            console.log('Finished generating query corpus');
        })
            .catch((err) => {
            console.log('Finished generating query corpus with error' + err);
        });
    });
}
else {
    console.log('Please provide a GitHub access token');
}
//# sourceMappingURL=generate-corpus.js.map