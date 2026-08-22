module.exports = {
  filtering: {
    allowedExtensions: [".js", ".jsx", ".ts", ".tsx"],

    ignoredDirectories: [
      "node_modules/",
      ".github/",
      "dist/",
      "build/",
      "coverage/",
      ".next/",
      "out/",
      "public/",
      "tests/",
      "__tests__/",
      "vendor/",
    ],

    ignoredFiles: [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
      ".gitignore",
      ".env",
      ".env.example",
      "Dockerfile",
      "docker-compose.yml",
    ],

    maxFiles: 50,
    maxChangedLines: 10000,
  },
};