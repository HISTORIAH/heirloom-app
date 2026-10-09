// Tailwind v4 runs as its own PostCSS plugin and handles vendor prefixes itself, so
// there's no autoprefixer. Same setup as the landing, blog and docs.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
