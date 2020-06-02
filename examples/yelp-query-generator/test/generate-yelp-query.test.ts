import { getYelpQueryGenerator } from "../src/index";
import { print } from "graphql";

test("Generate random Yelp query", () => {
  return getYelpQueryGenerator().then((yelpQueryGenerator) => {
    const query = yelpQueryGenerator.generateRandomYelpQuery();
    const { queryDocument, variableValues } = query;

    console.log(print(queryDocument));
    console.log(JSON.stringify(variableValues, null, 2));

    expect(queryDocument).toBeTruthy();
  });
}, 10000); // Needs to be longer to prevent overquerying the Yelp API
