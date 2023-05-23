# oclif-pnpm usage

This package is a modified version of [oclif](https://github.com/oclif/oclif) to be used on [pnpm](https://pnpm.io/), instead of npm or yarn.

Unfortunately, it suffers from a trying lack of updating, I don't have the time to keep up with all the modifications of the excellent oclif and I'm looking for help or a different solution, which could - perhaps - be represented by [pastel](https://github.com/vadimdemedes/pastel).


## create application
`
pnpx oclif-pnpm generate my-app
`

```

     _-----_     
    |       |    ╭──────────────────────────╮
    |--(o)--|    │  Time to build an oclif  │
   `---------´   │   CLI! Version: 3.4.3-2  │
    ( _´U`_ )    ╰──────────────────────────╯
    /___A___\   /
     |  ~  |     
   __'.___.'__   
 ´   `  |° ´ Y ` 

Clone in '/home/artisan/my-app' in corso...
? npm package name my-app
? command bin name the CLI will export my-app
? description my-app
? author Piero Proietti @pieroproietti
? license MIT
? Who is the GitHub owner of repository (https://github.com/OWNER/repo) 
pieroproietti
? What is the GitHub name of repository (https://github.com/owner/REPO) my-app
? Select a package manager 
  npm 
  yarn 
❯ pnpm 
```

## install packages
`
cd my-app
pnpm i
`

## build
`
cd my-app
pnpm build
`


## create deb package

`
cd my-app
pnpm deb
`
