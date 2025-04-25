"use client";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useParams } from "next/navigation";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { PlusIcon, MinusIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

import { Product } from "../../../../types/product";
import { getProductBySlug } from "../../../api/products";
import { fetchPromotions, fetchAmountOffProducts, calculateDiscountedPrice } from "@/api/promotions";
import { PromotionResponse, AmountOffProductResponse } from "../../../../types/promotion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ProductDetail() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [product, setProduct] = useState<Product | null>(null);
  // const { cart, addToCart } = useCart();
  const [promotions, setPromotions] = useState<PromotionResponse | null>(null);
  const [amountOffProducts, setAmountOffProducts] = useState<AmountOffProductResponse | null>(null);

  useEffect(() => {
    if (!slug) return;
    async function fetchProduct() {
      if (!slug) return;
      const data = await getProductBySlug(slug);
      setProduct(data);
    }
    fetchProduct();
    async function fetchPromotionData() {
      const promotionsData = await fetchPromotions();
      setPromotions(promotionsData);
      const amountOffProductsData = await fetchAmountOffProducts();
      setAmountOffProducts(amountOffProductsData);
    }
    fetchPromotionData();
  }, [slug]);

  if (!product || !promotions || !amountOffProducts) return <p>Loading...</p>;

  return <ProductPage product={product} promotions={promotions} amountOffProducts={amountOffProducts} />;
}

function ProductPage({ product, promotions, amountOffProducts }: { product: Product; promotions: PromotionResponse; amountOffProducts: AmountOffProductResponse }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  //Fetch the paragraphs from the product body
  const paragraphs = product.body.split("\n\n");
  const descriptionContent = paragraphs.slice(0, 2).join("\n\n"); //Two paragraphs
  const detailContent = paragraphs.slice(2).join("\n\n");

  //Images product
  const [selectedImage, setSelectedImage] = useState(product.media?.[0]?.url || "/banner.jpg");

  // Get the first category
  const firstCategory = ((product.categories ?? []) ?? []).length > 0 ? (product.categories ?? [])[0] : null;

  const handleAddToCart = async () => {
    const itemTotalPrice = (discountedPrice || product.pricing?.price) * quantity;
    const productData = {
      id: product.documentId,
      title: product.title,
      price: product.pricing?.price || 0,
      quantity,
      image: product.media?.[0]?.url || "/banner.jpg",
      totalPrice: itemTotalPrice,
    };

    addToCart(productData);
  };
  // Add discount price to product
  const { discountedPrice, discountPercentage } = calculateDiscountedPrice(product, promotions, amountOffProducts);

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-6 lg:px-12 py-12 mt-16 max-w-6xl relative">
        {/* Navigation bar */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center space-x-1">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <ChevronRightIcon className="h-4 w-4" />

          {firstCategory && (
            <>
              <Link
                href={`/category/${firstCategory.slug}`}
                className="hover:underline"
              >
                {firstCategory.name}
              </Link>
              <ChevronRightIcon className="h-4 w-4" />
            </>
          )}

          <span className="text-gray-700">{product.title}</span>
        </nav>

        {/* Left Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex gap-4">
            {/* Image grid */}
            <div className="flex flex-col space-y-2">
              {product.media?.map((image, index) => (
                <button key={index} onClick={() => setSelectedImage(image.url)}>
                  <Image
                    src={image.url}
                    alt={`Thumbnail ${index + 1}`}
                    width={80}
                    height={80}
                    className={`w-20 h-20 object-cover rounded-md border-2 ${selectedImage === image.url
                      ? "border-rose-500"
                      : "border-gray-300"
                      }`}
                  />
                </button>
              ))}
            </div>

            {/* Main image */}
            <div className="rounded-lg overflow-hidden shadow-lg">
              <Image
                src={selectedImage}
                alt={product.title}
                width={800}
                height={800}
                className="w-100 h-100 object-cover"
                priority
              />
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900">{product.title}</h1>

            {/* Price product */}
            <div className="flex items-center mt-2 space-x-3">
              {discountPercentage > 0 && (
                <span className="text-base text-gray-500 line-through mr-2">
                  ${product.pricing?.price?.toLocaleString() ?? "N/A"}
                </span>
              )}
              <span className="text-2xl font-semibold text-rose-500">
                ${discountedPrice?.toLocaleString() ?? product.pricing?.price?.toLocaleString() ?? "N/A"}
              </span>
              {discountPercentage > 0 && (
                <span className="bg-rose-100 text-rose-500 text-xs font-semibold px-4 py-1 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg animate-pulse">
                  -{discountPercentage}%
                </span>
              )}
            </div>
            {/* Description product */}
            <p className="text-gray-500 mt-4 text-sm">
              {typeof product.description === "string"
                ? product.description
                : JSON.stringify(product.description)}
            </p>

            {/* Quantity */}
            <div className="flex items-center gap-4 mt-8">
              <span className="text-lg text-gray-500">Quantity:</span>
              <div className="flex items-center gap-6 border rounded-full px-4 py-2 h-10">
                <button
                  className="text-lg font-bold"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="text-lg font-medium">{quantity}</span>
                <button
                  className="text-lg font-semibold"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                className="border-2 border-rose-500 text-rose-500 w-full py-2 rounded-full font-bold hover:bg-rose-500 hover:text-white transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg active:scale-95 animate-pulse"
                onClick={handleAddToCart}
              >
                ADD TO CART
              </button>
              <button className="bg-rose-400 text-white w-full py-2 rounded-full font-bold hover:bg-rose-500 transition">
                BUY NOW
              </button>
            </div>

            {/* Availability */}
            <div className="mt-6">
              <span className="text-gray-500 text-sm">Availability: </span>
              <span className="text-rose-500 font-medium">In Stock</span>
            </div>
            {/* Category */}
            <div className="mt-4">
              <span className="text-gray-500 text-sm">Categories: </span>
              {(product.categories ?? []).length > 0 ? (
                (product.categories ?? []).map((category, index) => (
                  <Link
                    key={category.documentId}
                    href={`/category/${category.slug}`}
                    className="text-rose-500 font-medium hover:underline"
                  >
                    {category.name}
                    {index < (product.categories ?? []).length - 1 && ", "}{" "}
                  </Link> //  Using index nsert "," and " " after category
                ))
              ) : (
                <span className="text-gray-400">No category</span>
              )}
            </div>
          </div>
        </div >

        {/* Body: Description and Details */}
        < div className="mt-12 flex flex-col lg:flex-row gap-8" >
          <div className="lg:w-2/3">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Description
            </h2>
            <div className="text-gray-700 leading-relaxed">
              <ReactMarkdown>{descriptionContent}</ReactMarkdown>
            </div>
          </div>

          <div className="lg:w-1/3">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Details
            </h2>
            <div className="text-gray-700 leading-relaxed">
              <ReactMarkdown>{detailContent}</ReactMarkdown>
            </div>
          </div>
        </div >
      </div >
      <Footer />
    </>
  );
}

