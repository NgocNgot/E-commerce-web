export interface Article {
  id: string;
  title: string;
  description: string;
  slug: string;
  cover: {
    url: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  content?: string;
}
