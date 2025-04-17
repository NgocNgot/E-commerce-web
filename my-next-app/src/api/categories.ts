import { gql } from "@apollo/client";
import client from "../lib/apolloClient";
import { Category } from "../../types/categories";

const GET_CATEGORIES = gql`
  query GetCategories {
    categories(
      filters: {
        slug: { in: ["cleanser", "lipstick", "lotions", "serum", "cream"] }
      }
    ) {
      documentId
      slug
      name
      media {
        url
      }
    }
  }
`;

export async function getCategories(): Promise<Category[]> {
  try {
    const { data } = await client.query({ query: GET_CATEGORIES });
    return data.categories || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
