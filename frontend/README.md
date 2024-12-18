# Frontend

## 使用 lerna + pnpm 管理项目

### 初始化

```bash
pnpm install

```

### 添加包

```bash
lerna create <package>
```

### 安装依赖

```bash
# 根目录    
pnpm i <dependency> -w

# 指定包
## 使用下来有问题，暂时不使用，进入到指定包目录下，使用 pnpm i <dependency>
pnpm i <dependency> -w <package1> -w <package2>
```
