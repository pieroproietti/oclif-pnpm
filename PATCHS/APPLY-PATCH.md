rm oclif -rf
git clone https://github.com/pieroproietti/oclif-pnpm oclif

# changed
## /src/commands/pack/deb.ts
patch ./oclif/src/commands/pack/deb.ts -i ./deb.ts.patch

## /src/commands/generate.ts
patch ./oclif/src/commands/generate.ts -i ./generate.ts.patch

## /src/generators/cli.ts
patch ./oclif/src/generators/cli.ts -i ./cli.ts.patch

## /src/tarballs/build.ts
patch ./oclif/src/tarballs/build.ts -i ./build.ts.patch

## /src/upload-utils.ts
patch ./oclif/src/upload-util.ts -i ./upload-util.ts.patch

## /src/types/version-indexes.ts
patch ./oclif/src/version-indexes.ts -i ./version-indexes.ts

## /README.md
patch ./oclif/README.md -i ./README.md.patch

## /package-scripts.js
patch ./oclif/package-scripts.js -i ./package-scripts.js.patch

## /package.json
patch ./oclif/package.json -i ./package.json.patch

## /README-verdaccio.md
cp ./oclif-pnpm/README-verdaccio.md  ./oclif/

# removed 
## /yarn.lock
rm ./oclif/yarn.lock


 