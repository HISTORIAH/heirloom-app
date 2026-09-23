export default (ctx) => {
  const isAppCss = !ctx.file || !ctx.file.includes("node_modules");
  return {
    plugins: {
      ...(isAppCss ? { tailwindcss: {} } : {}),
      autoprefixer: {},
    },
  };
};
