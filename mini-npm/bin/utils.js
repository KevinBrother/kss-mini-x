// @ts-check

const fs = require("fs-extra");
const path = require("path");

// 配置
const NPM_REGISTRY = "https://registry.npmjs.org/";
const NODE_MODULES = "node_modules";
const PACKAGE_LOCK = "package-lock.json";

const USER_CONFIG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".npmrc"
);

// 读取npm配置
 async function getNpmConfig() {
  try {
    if (await fs.pathExists(USER_CONFIG_PATH)) {
      const content = await fs.readFile(USER_CONFIG_PATH, "utf8");
      const config = {};
      content.split("\n").forEach((line) => {
        const [key, value] = line.trim().split("=");
        if (key && value) config[key.trim()] = value.trim();
      });
      return config;
    }
  } catch (err) {
    console.warn("读取npm配置失败，使用默认配置");
  }
  return {};
}

// 获取认证头
 async function getAuthHeader() {
  const config = await getNpmConfig();
  const token = config["//registry.npmjs.org/:_authToken"] || config.authToken;

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return {};
}

// 更新包锁文件
 async function updatePackageLock(packageName, version, packageData) {
  let lockData = {
    name: "my-project",
    version: "1.0.0",
    lockfileVersion: 2,
    requires: true,
    packages: {},
  };

  if (await fs.pathExists(PACKAGE_LOCK)) {
    lockData = await fs.readJson(PACKAGE_LOCK);
  }

  lockData.packages[`node_modules/${packageName}`] = {
    version,
    resolved: packageData.dist.tarball,
    integrity: packageData.dist.integrity,
    dependencies: packageData.dependencies || {},
  };

  await fs.writeJson(PACKAGE_LOCK, lockData, { spaces: 2 });
}

// 辅助函数：获取所有已安装包及其依赖关系
 async function getDependencyTree() {
  const tree = {};
  const nodeModulesPath = path.join(process.cwd(), NODE_MODULES);

  if (!(await fs.pathExists(nodeModulesPath))) {
    return tree;
  }

  const packages = await fs.readdir(nodeModulesPath);

  for (const pkgName of packages) {
    const pkgPath = path.join(nodeModulesPath, pkgName, "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      tree[pkgName] = {
        version: pkg.version,
        dependencies: pkg.dependencies || {},
      };
    }
  }

  return tree;
}

// 辅助函数：检查包是否被其他包依赖
 async function isPackageUsed(packageName, rootPackage = null) {
  const dependencyTree = await getDependencyTree();

  // 检查项目的package.json依赖
  const projectPkgPath = path.join(process.cwd(), "package.json");
  if (await fs.pathExists(projectPkgPath)) {
    const projectPkg = await fs.readJson(projectPkgPath);
    if (
      projectPkg.dependencies &&
      projectPkg.dependencies[packageName] &&
      (!rootPackage || projectPkg.name !== rootPackage)
    ) {
      return true;
    }
  }

  // 检查其他包的依赖
  for (const [pkg, info] of Object.entries(dependencyTree)) {
    if (
      pkg !== rootPackage &&
      info.dependencies &&
      info.dependencies[packageName]
    ) {
      return true;
    }
  }

  return false;
}

// 辅助函数：获取包的所有依赖（递归）
 async function getPackageDependencies(packageName) {
  const dependencies = new Set();
  const nodeModulesPath = path.join(process.cwd(), NODE_MODULES);
  const pkgPath = path.join(nodeModulesPath, packageName, "package.json");

  if (!(await fs.pathExists(pkgPath))) {
    return Array.from(dependencies);
  }

  const pkg = await fs.readJson(pkgPath);

  if (pkg.dependencies) {
    for (const dep of Object.keys(pkg.dependencies)) {
      dependencies.add(dep);
      // 递归获取子依赖
      const subDeps = await getPackageDependencies(dep);
      subDeps.forEach((subDep) => dependencies.add(subDep));
    }
  }

  return Array.from(dependencies);
}


module.exports = {
    NPM_REGISTRY,
    NODE_MODULES,
    PACKAGE_LOCK,
    USER_CONFIG_PATH,
    getNpmConfig,
    getAuthHeader,
    updatePackageLock,
    getDependencyTree,
    isPackageUsed,
    getPackageDependencies,
}