import vercel from "@sveltejs/adapter-vercel";
import node from "@sveltejs/adapter-node";
import sveltePreprocess from "svelte-preprocess";

const dockerBuild = process.env.DOCKER_BUILD;

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // hydrate the <div id="svelte"> element in src/app.html
    ssr: false,
    target: "#svelte",
    adapter: dockerBuild ? node() : vercel(),
  },
  preprocess: sveltePreprocess(),
  //   preprocess: sveltePreprocess(),
  //   plugins: [
  //     svelte({
  //       // enable run-time checks when not in production
  //       dev: !production,
  //       // we'll extract any component CSS out into
  //       // a separate file — better for performance
  //       css: (css) => {
  //         css.write("public/bundle.css");
  //       },
  //     }),
  //   ],
};

export default config;
