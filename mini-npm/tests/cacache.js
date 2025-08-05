const cacache = require("cacache");
const fs = require("fs");
const path = require("path");

const cachePath = path.resolve(__dirname, "cache");
const key = "my-unique-key-1234";

// Cache it! Use `cachePath` as the root of the content cache
cacache.put(cachePath, key, "10293801983029384").then((integrity) => {
  console.log(`Saved content to ${cachePath}. integrity: ${integrity}`);
});

cacache.get(cachePath, key).then(({ metadata, integrity, data, size }) => {
  console.log(
    `Fetched content from ${cachePath}. metadata: ${metadata}, integrity: ${integrity}, data: ${data}, size: ${size}`
  );
});
