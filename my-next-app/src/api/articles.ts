import { gql } from "@apollo/client";
import client from "../lib/apolloClient";
const BASE_URL = "http://localhost:1337";
// Article type
export interface Article {
  title: string;
  documentId: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  body: string;
  slug: string;
  cover?: {
    url: string;
  };
  ogImage?: string;
}

// GraphQL-get article
const GET_ARTICLES = gql`
  query GetArticles {
    articles {
      documentId
      title
      description
      slug
      cover {
        url
      }
      blocks {
        ... on ComponentSharedSeo {
          metaTitle
          metaDescription
          keywords
          shareImage {
            url
          }
        }
      }
    }
  }
`;

// GraphQL-get article by slug
const GET_ARTICLE_BY_SLUG = gql`
  query GetArticle($slug: String!) {
    articles(filters: { slug: { eq: $slug } }) {
      documentId
      title
      description
      slug
      cover {
        url
      }
      blocks {
        ... on ComponentSharedSeo {
          metaTitle
          metaDescription
          keywords
          shareImage {
            url
          }
        }
        ... on ComponentSharedRichText {
          body
        }
      }
    }
  }
`;

// Fetch data
export async function getArticles(): Promise<Article[]> {
  try {
    const { data } = await client.query({ query: GET_ARTICLES });
    return data.articles || [];
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

// Get article by slug
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const { data } = await client.query({
      query: GET_ARTICLE_BY_SLUG,
      variables: { slug },
    });

    if (!data || !data.articles || data.articles.length === 0) {
      console.error("Not found article by slug:", slug);
      return null;
    }

    const articleData = data.articles[0];
    const seoBlock = articleData.blocks.find(
      (block: any) => block.__typename === "ComponentSharedSeo"
    );
    // Check data
    console.log("Fetched article:", JSON.stringify(articleData, null, 2));

    return {
      title: articleData.title || "No title",
      documentId: articleData.documentId || "",
      description: articleData.description || "",
      metaTitle: seoBlock?.metaTitle || articleData.title || "Default Title",
      metaDescription: seoBlock?.metaDescription || "Default Description",
      metaKeywords: seoBlock?.keywords || "Default Keywords",
      body: articleData.blocks.find(
        (block: any) => block.__typename === "ComponentSharedRichText"
      )?.body || "Default Body",
      slug: articleData.slug,
      cover: articleData.cover
        ? { url: articleData.cover.url.startsWith("/") ? BASE_URL + articleData.cover.url : articleData.cover.url }
        : undefined,
      ogImage: seoBlock?.shareImage?.url
        ? seoBlock.shareImage.url.startsWith("/") ? BASE_URL + seoBlock.shareImage.url : seoBlock.shareImage.url
        : "",
    };
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
}
