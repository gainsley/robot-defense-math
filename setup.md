npm create vite@latest . -- --template vanilla-ts
npm install pixi.js # graphics/app
npm install pixijs-skills # LLM skills
npm install howler # audio
npm install pixi-filters

mkdir .claude
mkdir .codex
cp -r ~/go/src/github.com/pixijs/pixijs-skills/skills .claude
cp -r ~/go/src/github.com/pixijs/pixijs-skills/skills .codex

# modify src/main.ts with your pixijs main code
# modify style.css to the bare basics:
```
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
}

canvas {
  display: block;
}
```

# delete unneeded assets: hero.png, typescript.svg, vite.svg
# delete unneeded code: src/counter.ts

# later:
npm install --save-dev electron
