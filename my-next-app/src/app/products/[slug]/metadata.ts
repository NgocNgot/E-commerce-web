import { Metadata } from "next";
import { Product } from "../../../../types/product";
import { getProductBySlug } from "@/api/products";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product: Product | null = await getProductBySlug(params.slug);
  const title = product?.metaTitle || "Not found metaTitle";
  const description = product?.metaDescription || "Not found metaDescription";
  const keywords = product?.metaKeywords || "Not found keywords";
  const image = product?.media?.[0]?.url
    ? `http://localhost:1337${product.media[0].url}`
    : "/banner.jpg";

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
  };
}
