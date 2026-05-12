export const mdxComponents = {
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <figure className="my-8">
      <img src={src} alt={alt} className="w-full border-4 border-black object-cover" />

      {alt && (
        <figcaption className="text-xs font-bold upper tracking-widest text-black/40 mt-2">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
};
