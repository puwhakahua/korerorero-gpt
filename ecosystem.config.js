const BASE_DIR = __dirname;

module.exports = {
  apps: [
    {
      name: "korerorero-gpt",
      cwd: BASE_DIR,

      script: "npm",
      args: "run start",

      env: {
        PORT: "3002",
        NODE_ENV: "production",

        LD_LIBRARY_PATH:
          `BASE_DIR/piper:` +
          (process.env.LD_LIBRARY_PATH || ""),
      },
    },
  ],
};
