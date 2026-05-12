import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { posts } from "@historiah/blog";
import type { PostMeta } from "@historiah/blog";
import { mdxComponents } from "@/components/ui/MdxComponents";

const ACCENT_CYCLE = [
  {
    tag: "bg-accent-lime text-black border-black",
    hover: "hover:bg-accent-lime",
    number: "text-black",
    arrow: "group-hover:bg-black group-hover:text-accent-lime",
  },
  {
    tag: "bg-accent-pink text-black border-black",
    hover: "hover:bg-accent-pink",
    number: "text-black",
    arrow: "group-hover:bg-black group-hover:text-accent-pink",
  },
  {
    tag: "bg-accent-cyan text-black border-black",
    hover: "hover:bg-accent-cyan",
    number: "text-black",
    arrow: "group-hover:bg-black group-hover:text-accent-cyan",
  },
  {
    tag: "bg-accent-yellow text-black border-black",
    hover: "hover:bg-accent-yellow",
    number: "text-black",
    arrow: "group-hover:bg-black group-hover:text-accent-yellow",
  },
  {
    tag: "bg-accent-orange text-black border-black",
    hover: "hover:bg-accent-orange",
    number: "text-black",
    arrow: "group-hover:bg-black group-hover:text-accent-orange",
  },
  {
    tag: "bg-accent-purple text-white border-black",
    hover: "hover:bg-accent-purple",
    number: "text-black",
    arrow: "group-hover:bg-black group-hover:text-accent-purple",
  },
];

const POSTS_PER_PAGE = 10;

function BlogList() {
  const [page, setPage] = useState(1);
  const published = posts.filter((p: PostMeta) => p.published);

  const totalPages = Math.ceil(published.length / POSTS_PER_PAGE);
  const start = (page - 1) * POSTS_PER_PAGE;
  const paginated = published.slice(start, start + POSTS_PER_PAGE);

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-black px-8 py-16 md:px-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-display font-black text-sm uppercase tracking-widest mb-8 hover:text-accent-pink transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform inline-block">
            <ArrowLeft className="h-5 w-5" />
          </span>
          Home
        </Link>

        <p className="text-base font-bold uppercase tracking-[0.2em] text-black/50 mb-3 hover:text-black">
          HEIRLOOM BLOG
        </p>

        <h1 className="font-display text-6xl md:text-8xl font-black text-black leading-none">
          Latest <span className="bg-accent-lime px-2 inline-block rotate-[2deg]">writes.</span>
        </h1>

        <div className="flex gap-0 mt-8 h-3">
          <div className="flex-1 bg-accent-pink border-2 border-black" />
          <div className="flex-1 bg-accent-lime border-2 border-black border-l-0" />
          <div className="flex-1 bg-accent-cyan border-2 border-black border-l-0" />
          <div className="flex-1 bg-accent-yellow border-2 border-black border-l-0" />
          <div className="flex-1 bg-accent-orange border-2 border-black border-l-0" />
          <div className="flex-1 bg-accent-purple border-2 border-black border-l-0" />
        </div>
      </div>

      <ul className="divide-y-4 divide-black">
        {paginated.map((post: PostMeta, index: number) => {
          const globalIndex = start + index;
          const accent = ACCENT_CYCLE[globalIndex % ACCENT_CYCLE.length];

          return (
            <li key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className={`group flex flex-col md:flex-row md:items-center gap-4 px-8 py-8 md:px-16 md:py-10 ${accent.hover} transition-colors duration-150`}
              >
                <span
                  className={`font-display text-5xl font-black ${accent.number} opacity-30 group-hover:opacity-60 w-16 shrink-0 leading-none select-none transition-opacity`}
                >
                  {String(globalIndex + 1).padStart(2, "0")}
                </span>

                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {post.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className={`text-[10px] font-bold uppercase tracking-widest border-2 px-2 py-0.5 ${accent.tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-black text-black leading-tight mb-2 group-hover:underline decoration-4 underline-offset-2">
                    {post.title}
                  </h2>
                  <p className="text-black/60 text-sm leading-relaxed max-w-xl">{post.excerpt}</p>
                </div>

                <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-2 shrink-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`w-10 h-10 border-4 border-black flex items-center justify-center font-black text-lg transition-colors duration-150 ${accent.arrow}`}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {published.length === 0 && (
        <div className="px-8 py-24 md:px-16 text-center">
          <p className="font-display text-2xl font-black text-black/30 uppercase tracking-widest">
            No posts yet.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="border-t-4 border-black px-8 py-8 md:px-16 flex items-center justify-between">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="inline-flex items-center gap-2 font-display font-black text-sm uppercase tracking-widest border-4 border-black px-5 py-3 hover:bg-black hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-5 w-5" /> Prev
          </button>

          <div className="flex items-center gap-0">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`w-10 h-10 border-4 border-black font-display font-black text-sm transition-colors
                  ${p === page ? "bg-black text-accent-lime" : "hover:bg-accent-lime"}
                  ${p > 1 ? "border-l-0" : ""}
                `}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className="inline-flex items-center gap-2 font-display font-black text-sm uppercase tracking-widest border-4 border-black px-5 py-3 hover:bg-black hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            Next <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function BlogPost() {
  const { slug } = useParams();
  const Post = lazy(() => import(`@blog/${slug}.mdx`));

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-black px-8 py-4 md:px-16 flex items-center justify-between">
        <Link
          to="/blog"
          className="font-display font-black text-sm uppercase tracking-widest hover:text-accent-pink transition-colors group inline-flex items-center gap-2"
        >
          <span className="group-hover:-translate-x-1 transition-transform inline-block">
            <ArrowLeft className="h-5 w-5" />
          </span>
          All posts
        </Link>

        <Link
          to="/"
          className="text-xl font-bold uppercase tracking-widest text-black hover:text-black transition-colors"
        >
          <span className="bg-accent-yellow px-3 inline-block rotate-[-1deg]">Heirloom</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="px-8 py-24 md:px-16">
            <div className="w-8 h-8 border-4 border-black border-t-accent-lime animate-spin" />
          </div>
        }
      >
        <article
          className="
            max-w-5xl mx-auto px-8 py-16 md:px-16
 
            prose prose-lg
            prose-headings:font-display
            prose-headings:font-black
          prose-headings:text-black
            prose-headings:leading-tight
 
            prose-h1:text-5xl
            prose-h2:text-3xl
            prose-h2:border-b-4
          prose-h2:border-black
            prose-h2:pb-2
 
          prose-p:text-black/70
            prose-p:leading-relaxed
 
          prose-a:text-black
            prose-a:font-bold
            prose-a:decoration-4
            prose-a:decoration-accent-pink
            hover:prose-a:decoration-accent-lime
 
          prose-strong:text-black
            prose-strong:font-black
 
            prose-code:bg-accent-lime
            prose-code:text-black
            prose-code:before:content-none
            prose-code:after:content-none

            [&_pre_code]:bg-transparent 
            [&_pre_code]:text-white
            [&_pre_code]:p-0

            prose-pre:bg-black
            prose-pre:text-white
            prose-pre:rounded-none
            prose-pre:border-l-4
            prose-pre:border-l-accent-lime
            prose-pre:border-y-0
            prose-pre:border-r-0
            prose-pre:px-6
            prose-pre:py-5
            prose-pre:text-sm
            prose-pre:leading-relaxed
 
            prose-blockquote:border-l-8
            prose-blockquote:border-l-accent-pink
            prose-blockquote:bg-accent-lime/20
            prose-blockquote:not-italic
            prose-blockquote:px-6
            prose-blockquote:py-1
 
            prose-hr:border-4
          prose-hr:border-black
 
          prose-li:text-black/70
 
            prose-img:border-4
          prose-img:border-black
          "
        >
          <Post components={mdxComponents} />
        </article>
      </Suspense>
    </div>
  );
}

export default function Blog() {
  const { slug } = useParams();
  return slug ? <BlogPost /> : <BlogList />;
}
