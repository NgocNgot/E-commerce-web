import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

import { Category } from "../../types/categories";
import { getCategories } from "@/api/categories";
import { Product } from "../../types/product";
import { getProducts, getProductBySlug } from "../api/products";
import { fetchPromotions, fetchAmountOffProducts, calculateDiscountedPrice } from "@/api/promotions";
import { PromotionResponse, AmountOffProductResponse } from "../../types/promotion";

export async function generateMetadata(): Promise<Metadata> {
  const URL = "http://localhost:3000";
  const slug = "liceria-beauty-skincare";
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "No metaTitle",
      description:
        "No metaDescription",
      keywords:
        "No metaKeywords",
      openGraph: {
        title: "No metaTitle in graph",
        description:
          "No metaDescription in graph",
        url: URL,
        type: "website",
        images: [
          {
            url: "./banner.jpg",
            width: 1200,
            height: 630,
            alt: "Image",
          },
        ],
      },
    };
  }

  return {
    title: product.metaTitle,
    description: product.metaDescription,
    keywords: product.metaKeywords,
    openGraph: {
      title: product.metaTitle,
      description: product.metaDescription,
      url: `${URL}/product/${product.slug}`,
      type: "website",
      images: [
        {
          url: typeof product.media === "string"
            ? product.media
            : product.media[0]?.url
              ? `http://localhost:1337${product.media[0].url}`
              : "/default-og.jpg",
          width: 1200,
          height: 630,
          alt: product.metaTitle,
        },
      ],
    },
  };
}

export default async function HomePage() {
  const products: Product[] = await getProducts();
  console.log("List of products in HomePage:", products);

  const categories: Category[] = await getCategories();
  const promotions: PromotionResponse = await fetchPromotions();
  const amountOffProducts: AmountOffProductResponse = await fetchAmountOffProducts();

  return (
    <>
      <Navbar />
      <Header />

      {/* Shop by Categories */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold">Shop By Categories</h2>
        <p className="text-gray-500 mt-2">
          Here's some of our most popular products people are in love with.
        </p>
        <div className="flex justify-center gap-8 mt-6">
          {categories.length > 0 ? (
            categories.map((category) => (
              <div key={category.documentId} className="text-center">
                <div className="w-40 h-40 mx-auto rounded-full overflow-hidden">
                  <Image
                    src={`http://localhost:1337${category.media?.url}`}
                    alt={category.name}
                    width={200}
                    height={200}
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 font-medium">{category.name}</p>
                <p className="text-gray-400 text-sm">count products</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No categories available.</p>
          )}
        </div>
      </section>

      {/* List of Products */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold">New In Products</h2>
        <p className="text-gray-500 mt-2">
          Here's some of our most popular products people are in love with.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6 container mx-auto px-6">
          {products.length > 0 ? (
            products
              .filter((product) => product.slug !== "liceria-beauty-skincare")
              .map((product) => {
                const { discountedPrice, discountPercentage } = calculateDiscountedPrice(product, promotions, amountOffProducts);

                return (
                  <div
                    key={product.documentId}
                    className="bg-white p-0 relative group"
                  >

                    {discountPercentage > 0 && (
                      <div className="absolute left-4 bg-rose-400 text-white px-3 py-1 z-10 text-xs shadow-lg">
                        -{discountPercentage}%
                      </div>
                    )}


                    <Link
                      href={`/products/${product.slug}`}
                      className="absolute inset-0 z-10"
                    >
                      <span className="sr-only">Go to product</span>
                    </Link>
                    <div className="bg-white pt-4 pb-4 transition-transform hover:scale-105 relative">
                      {product.media?.length > 0 ? (
                        <Image
                          src={`http://localhost:1337${product.media[0].url}`}
                          alt={product.title || "Product Image"}
                          width={200}
                          height={200}
                          className="object-cover w-full h-full transition-opacity duration-500 group-hover:opacity-30"
                        />
                      ) : (
                        <Image
                          src="/default-thumbnail.jpg"
                          alt="Default Product Image"
                          width={200}
                          height={200}
                          className="object-cover w-full h-full transition-opacity duration-500 group-hover:opacity-50"
                        />
                      )}
                      <button className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 bg-rose-500 text-white text-base shadow-lg px-4 py-2 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
                        <ShoppingCartIcon className="h-6 w-6" />
                        <span>Add to cart</span>
                      </button>
                      <h2 className="text-base font-semibold mt-2">{product.title}</h2>
                      <div className="mt-2 flex items-center justify-center">
                        {discountPercentage > 0 && (
                          <span className="text-sm text-gray-500 line-through mr-2">
                            ${product.pricing?.price?.toLocaleString() ?? "N/A"}
                          </span>
                        )}
                        <span className="text-base text-rose-400 ml-2">
                          ${discountedPrice?.toLocaleString() ?? product.pricing?.price?.toLocaleString() ?? "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <p className="text-center text-gray-500">No products available.</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}