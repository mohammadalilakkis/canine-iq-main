"use strict";
const fs = require("fs");
const path = require("path");

const loadConfigPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "metro-config",
  "src",
  "loadConfig.js"
);

if (!fs.existsSync(loadConfigPath)) {
  process.exit(0);
}

let code = fs.readFileSync(loadConfigPath, "utf8");

if (code.includes("_url.pathToFileURL(absolutePath)")) {
  process.exit(0);
}

code = code.replace(
  /var path = _interopRequireWildcard\(require\("path"\)\);\r?\nvar _yaml = require\("yaml"\);/,
  'var path = _interopRequireWildcard(require("path"));\nvar _url = require("url");\nvar _yaml = require("yaml");'
);

code = code.replace(
  "const configModule = await import(absolutePath);",
  `const configModule = await import(
          _url.pathToFileURL(absolutePath).href
        );`
);

fs.writeFileSync(loadConfigPath, code);
