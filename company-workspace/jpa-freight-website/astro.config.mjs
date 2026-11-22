import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Served behind host nginx at /dev/jpa-marketing-website/ (prefix stripped to container /)
export default defineConfig({
  base: '/dev/jpa-marketing-website',
  // Always use trailing slashes so nginx never 301s /services → /services/
  // (that redirect drops the /dev/jpa-marketing-website prefix behind host proxy).
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
