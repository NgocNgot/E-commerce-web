export interface Product {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  // Shipping need
  weight: number;
  length: number;
  width: number;
  height: number;
  description?: string | { children: { text: string }[] }[];
  media: { url: string }[];
  pricing: { price: number };
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  body: string;
  categories?: { documentId: string; slug: string; name: string }[];
}
