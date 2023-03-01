# Verdaccio

## Installation

```
sudo npm i verdaccio@6-next -g
```

# Add user to local registry
```
pnpm adduser --registry http://localhost:4873 --auth-type=legacy
```

# Log user to local registry
```
pnpm login --registry http://localhost:4873 --auth-type=legacy
```

# Setting registry

## Global

```
pnpm set registry http://localhost:4873/
pnpm set registry https://registry.npmjs.org

```
## Specific project
```
pnpm set registry http://localhost:4873/ --location ~/oclif-pnpm
pnpm set registry https://registry.npmjs.org --location ~/oclif-pnpm

```
#$ Using registry only on specific command
```
pnpm install --registry http://localhost:4873
pnpm install --registry https://registry.npmjs.org
```

# Publish package
```
cd oclif
pnpm publish --registry http://localhost:4873
```

# Unpublish
```
pnpm unpublish oclif --registry http://localhost:4873
```

