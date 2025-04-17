import { gql } from "@apollo/client";
import client from "../lib/apolloClient";
import { Product } from "../../types/product";

const BASE_URL = "http://localhost:1337";

const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      documentId
      title
      description
      slug
      weight
      length
      width
      height
      media {
        url
      }
      categories {
        documentId
        slug
        name
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
      pricing {
        price
      }
    }
  }
`;

// GraphQL-get product by slug
const GET_PRODUCT_BY_SLUG = gql`
  query GetProduct($slug: String!) {
    products(filters: { slug: { eq: $slug } }) {
      documentId
      title
      description
      slug
      weight
      length
      width
      height
      media {
        url
      }
      categories {
        documentId
        slug
        name
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
      pricing {
        price
      }
    }
  }
`;

// Fetch data
export async function getProducts(): Promise<Product[]> {
  try {
    const { data } = await client.query({ query: GET_PRODUCTS });
    return data.products
      ? data.products
          .filter(
            (product: Product) => product.slug !== "liceria-beauty-skincare"
          )
          .map((product: any) => ({
            ...product,
            categories: product.categories || [],
          }))
      : [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Get product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    console.log("Fetching product by slug:", slug);

    const { data } = await client.query({
      query: GET_PRODUCT_BY_SLUG,
      variables: { slug },
    });

    if (!data || !data.products || data.products.length === 0) {
      console.error("Not found product by slug:", slug);
      return null;
    }

    const productData = data.products[0];
    const seoBlock = productData.blocks.find(
      (block: any) => block.__typename === "ComponentSharedSeo"
    );
    // Check data
    console.log("Fetched product:", JSON.stringify(productData, null, 2));

    return {
      id: productData.documentId || "", // Map the id field
      title: productData.title || "No title",
      documentId: productData.documentId || "",
      description: productData.description || "",
      metaTitle: seoBlock?.metaTitle || productData.title || "Default Title",
      metaDescription: seoBlock?.metaDescription || "Default Description",
      metaKeywords: seoBlock?.keywords || "Default Keywords",
      weight: productData.weight || 0,
      length: productData.length || 0,
      width: productData.width || 0,
      height: productData.height || 0,
      body:
        productData.blocks.find(
          (block: any) => block.__typename === "ComponentSharedRichText"
        )?.body || "Default Body",
      slug: productData.slug,
      pricing: { price: productData.pricing?.price },
      media: productData.media
        ? productData.media.map((mediaItem: any) => ({
            url: mediaItem.url.startsWith("/")
              ? BASE_URL + mediaItem.url
              : mediaItem.url,
          }))
        : [],
      categories: productData.categories || [],
    };
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    return null;
  }
}
