import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getArticleBySlug, Article } from "../../../api/articles";
import { Metadata } from "next";
import ReactMarkdown from "react-markdown";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article: Article | null = await getArticleBySlug(params.slug);
  const title = article?.metaTitle || "Not found metaTitle";
  const description = article?.metaDescription || "Not found metaDescription";
  const keywords = article?.metaKeywords || "Not found keywords";
  const image = article?.cover?.url ? `http://localhost:1337${article.cover.url}` : "/banner.jpg";

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function BlogDetail({ params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug);

  if (!article) return notFound();

  return (
    <div className="container mx-auto px-6 lg:px-12 py-12 max-w-6xl relative">
      {/* Button Back */}
      <Link 
        href="/#" 
        className="bg-cyan-600 text-white absolute top-4 left-12 px-4 py-2 rounded-full shadow-md hover:bg-cyan-900 transition"
      >
        ← Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
        {/* Left Side */}
        
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mt-0 mb-8 drop-shadow-lg">{article.title}</h1>

        
          {article.cover?.url || article.ogImage ? (
            <div className="w-full rounded-lg overflow-hidden shadow-lg">
              <Image
                src={article.cover?.url || article.ogImage!}
                alt={article.title || "Ảnh bài viết"}
                width={800}
                height={400}
                className="w-full h-80 object-cover"
                priority
              />
            </div>
          ) : (
            <p className="text-gray-500 italic">Not Image</p>
          )}
        </div>

        {/* Right Side */}
        <div>
          <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed bg-cyan-600/10 p-6 rounded-lg shadow-md">
            <ReactMarkdown>{article.body}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
