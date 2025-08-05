#!/usr/bin/env node
// @ts-check
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const semver = require("semver");
const { program } = require("commander");
const tar = require("tar");
const os = require("os");

const {
  NPM_REGISTRY,
  NODE_MODULES,
  PACKAGE_LOCK,
  getAuthHeader,
  updatePackageLock,
  isPackageUsed,
  getPackageDependencies,
} = require("./utils");

// 1. 发布包
async function publishPackage(localPath = process.cwd()) {
  try {
    // 读取package.json
    const pkgPath = path.join(localPath, "package.json");
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error("未找到package.json");
    }

    const pkg = await fs.readJson(pkgPath);
    if (!pkg.name || !pkg.version) {
      throw new Error("package.json必须包含name和version字段");
    }

    console.log(`准备发布 ${pkg.name}@${pkg.version}...`);

    // 创建tar包
    const tarPath = path.join(os.tmpdir(), `${pkg.name}-${pkg.version}.tgz`);
    await tar.create(
      {
        file: tarPath,
        cwd: localPath,
        gzip: true,
        filter: (path) => {
          // 过滤不需要的文件
          return (
            !path.includes("node_modules") &&
            !path.includes(".git") &&
            !path.includes("dist") &&
            !path.includes("coverage")
          );
        },
      },
      await fs.readdir(localPath)
    );

    // 读取tar包内容
    const tarContent = await fs.readFile(tarPath);

    // 准备发布数据
    const publishData = {
      _id: `${pkg.name}@${pkg.version}`,
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      main: pkg.main,
      keywords: pkg.keywords,
      author: pkg.author,
      license: pkg.license,
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };

    // 获取认证头
    const headers = await getAuthHeader();
    if (Object.keys(headers).length === 0) {
      throw new Error("请先使用npm login登录或配置_authToken");
    }

    // 发送发布请求
    const response = await axios.put(
      `${NPM_REGISTRY}${pkg.name}/${pkg.version}`,
      publishData,
      {
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 201) {
      // 上传tar包
      await axios.put(
        `${NPM_REGISTRY}${pkg.name}/-/${pkg.name}-${pkg.version}.tgz`,
        tarContent,
        {
          headers: {
            ...headers,
            "Content-Type": "application/octet-stream",
            "Content-Length": tarContent.length,
          },
        }
      );

      console.log(`成功发布 ${pkg.name}@${pkg.version}`);
    }

    // 清理临时文件
    await fs.remove(tarPath);
  } catch (err) {
    console.error("发布失败:", err.response?.data?.error || err.message);
    process.exit(1);
  }
}

// 2. 安装包
async function installPackage(packageName, versionRange = "latest") {
  try {
    console.log(`安装 ${packageName}@${versionRange}...`);

    // 确保package.json存在
    let pkg;
    const pkgPath = path.join(process.cwd(), "package.json");
    if (await fs.pathExists(pkgPath)) {
      pkg = await fs.readJson(pkgPath);
    } else {
      pkg = { name: "my-project", version: "1.0.0", dependencies: {} };
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }

    // 查询包信息
    const response = await axios.get(`${NPM_REGISTRY}${packageName}`);
    const pkgData = response.data;

    // 确定要安装的版本
    let version;
    if (versionRange === "latest") {
      version = pkgData["dist-tags"].latest;
    } else if (pkgData.versions[versionRange]) {
      version = versionRange;
    } else {
      // 查找符合版本范围的最新版本
      const versions = Object.keys(pkgData.versions).sort((a, b) =>
        semver.rcompare(a, b)
      );

      version = versions.find((v) => semver.satisfies(v, versionRange));
      if (!version) {
        throw new Error(`找不到符合版本范围 ${versionRange} 的版本`);
      }
    }

    const targetVersion = pkgData.versions[version];
    console.log(`将安装版本: ${version}`);

    // 创建node_modules目录
    await fs.ensureDir(NODE_MODULES);

    // 下载tar包
    const tarUrl = targetVersion.dist.tarball;
    const tarResponse = await axios.get(tarUrl, { responseType: "stream" });

    // 解压到node_modules
    const targetDir = path.join(NODE_MODULES, packageName);
    await fs.ensureDir(targetDir);

    await new Promise((resolve, reject) => {
      const extract = tar.extract({ cwd: targetDir, strip: 1 });
      // 流式解压
      tarResponse.data.pipe(extract);
      extract.on("end", resolve);
      extract.on("error", reject);
    });

    // 更新package.json
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies[packageName] = versionRange;
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });

    // 更新锁文件
    await updatePackageLock(packageName, version, targetVersion);

    // 安装依赖
    if (targetVersion.dependencies) {
      console.log(`正在安装 ${packageName} 的依赖...`);
      for (const [depName, depRange] of Object.entries(
        targetVersion.dependencies
      )) {
        await installPackage(depName, depRange);
      }
    }

    console.log(`${packageName}@${version} 安装完成`);
  } catch (err) {
    console.error(`安装 ${packageName} 失败:`, err.message);
    process.exit(1);
  }
}

// 3. 卸载包
async function uninstallPackage(packageName, isDependency = false) {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (!(await fs.pathExists(pkgPath)) && !isDependency) {
      throw new Error("未找到package.json");
    }

    // 如果是顶级包（不是作为依赖被卸载），检查是否存在于package.json中
    if (!isDependency) {
      const pkg = await fs.readJson(pkgPath);
      if (!pkg.dependencies || !pkg.dependencies[packageName]) {
        console.log(`${packageName} 未安装`);
        return;
      }
    }

    // 获取该包的所有依赖
    const dependencies = await getPackageDependencies(packageName);
    console.log(`${packageName} 有 ${dependencies.length} 个依赖需要检查`);

    // 先卸载子依赖（从最深层开始）
    for (const dep of dependencies.reverse()) {
      // 检查依赖是否被其他包使用（排除当前正在卸载的包）
      const used = await isPackageUsed(dep, packageName);
      if (!used) {
        console.log(`正在卸载未被使用的依赖: ${dep}`);
        await uninstallPackage(dep, true);
      } else {
        console.log(`依赖 ${dep} 被其他包使用，保留`);
      }
    }

    // 从package.json移除（仅针对顶级包）
    if (!isDependency) {
      const pkg = await fs.readJson(pkgPath);
      delete pkg.dependencies[packageName];
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }

    // 删除node_modules中的包
    const targetDir = path.join(NODE_MODULES, packageName);
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
      console.log(`已删除 ${packageName}`);
    }

    // 更新锁文件
    if (await fs.pathExists(PACKAGE_LOCK)) {
      const lockData = await fs.readJson(PACKAGE_LOCK);
      delete lockData.packages[`node_modules/${packageName}`];
      await fs.writeJson(PACKAGE_LOCK, lockData, { spaces: 2 });
    }

    if (!isDependency) {
      console.log(`${packageName} 及其未被使用的依赖卸载完成`);
    }
  } catch (err) {
    console.error("卸载失败:", err.message);
    if (!isDependency) process.exit(1);
  }
}

// 4. 查看包信息
async function listPackage(packageName) {
  try {
    const nodeModulesPath = path.join(process.cwd(), NODE_MODULES);
    if (!(await fs.pathExists(nodeModulesPath))) {
      console.log("未安装任何包");
      return;
    }

    // 查看单个包
    if (packageName) {
      const pkgPath = path.join(nodeModulesPath, packageName, "package.json");
      if (!(await fs.pathExists(pkgPath))) {
        console.log(`${packageName} 未安装`);
        return;
      }

      const pkg = await fs.readJson(pkgPath);
      console.log(`${packageName}@${pkg.version}`);

      if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
        console.log("依赖:");
        Object.entries(pkg.dependencies).forEach(([name, version]) => {
          console.log(`  ${name}: ${version}`);
        });
      }
      return;
    }

    // 查看所有包
    const pkgPath = path.join(process.cwd(), "package.json");
    if (await fs.pathExists(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      if (pkg.dependencies) {
        console.log("已安装的包:");
        Object.entries(pkg.dependencies).forEach(([name, range]) => {
          try {
            const installedPkg = require(path.join(
              nodeModulesPath,
              name,
              "package.json"
            ));
            console.log(`  ${name}: ${installedPkg.version} (需求: ${range})`);
          } catch (err) {
            console.log(`  ${name}: 未安装 (需求: ${range})`);
          }
        });
      } else {
        console.log("没有安装任何依赖包");
      }
    }
  } catch (err) {
    console.error("查询失败:", err.message);
    process.exit(1);
  }
}

// 5. 更新包
async function updatePackage(packageName) {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error("未找到package.json");
    }

    const pkg = await fs.readJson(pkgPath);
    if (!pkg.dependencies || !pkg.dependencies[packageName]) {
      throw new Error(`${packageName} 未安装`);
    }

    // 查询最新版本
    const response = await axios.get(`${NPM_REGISTRY}${packageName}`);
    const latestVersion = response.data["dist-tags"].latest;
    console.log(`${packageName} 最新版本: ${latestVersion}`);

    // 卸载旧版本
    await uninstallPackage(packageName);

    // 安装最新版本
    await installPackage(packageName, latestVersion);

    console.log(`${packageName} 已更新到最新版本 ${latestVersion}`);
  } catch (err) {
    console.error("更新失败:", err.message);
    process.exit(1);
  }
}

// 配置命令行
program
  .name("mini-npm")
  .description("对接真实npm仓库的迷你包管理工具")
  .version("1.0.0");

// 发布命令
program
  .command("publish [path]")
  .description("发布包到npm仓库")
  .action(publishPackage);

// 安装命令
program
  .command("install <package> [version]")
  .alias("i")
  .description("安装包")
  .action(installPackage);

// 卸载命令
program
  .command("uninstall <package>")
  .description("卸载包")
  .action(uninstallPackage);

// 查看命令
program
  .command("ls [package]")
  .description("查看已安装的包")
  .action(listPackage);

// 更新命令
program
  .command("update <package>")
  .description("更新包到最新版本")
  .action(updatePackage);

// 运行命令
program.parse(process.argv);
