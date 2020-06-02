import { getGitHubQueryGenerator } from "../src/index";
import { print } from "graphql";

test("Generate random GitHub query", () => {
  return getGitHubQueryGenerator().then((gitHubQueryGenerator) => {
    const query = gitHubQueryGenerator.generateRandomGitHubQuery();
    const { queryDocument, variableValues } = query;

    console.log(print(queryDocument));
    console.log(JSON.stringify(variableValues, null, 2));

    expect(queryDocument).toBeTruthy();
  });
});
