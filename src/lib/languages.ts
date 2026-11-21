/** GitHub's colour for each language we know, plus a simple-icons glyph where one fits */
const KNOWN = new Map(
  Object.entries<[colour: string, icon?: string]>({
    Ada: ['#02f88c', 'ada'],
    Astro: ['#ff5a03', 'astro'],
    AutoHotkey: ['#6594b9', 'autohotkey'],
    C: ['#555555', 'c'],
    'C#': ['#7355dd', 'dotnet'],
    'C++': ['#f34b7d', 'cplusplus'],
    CMake: ['#da3434', 'cmake'],
    CSS: ['#663399', 'css'],
    Clojure: ['#db5855', 'clojure'],
    CoffeeScript: ['#244776', 'coffeescript'],
    'Common Lisp': ['#3fb68b', 'commonlisp'],
    Crystal: ['#000100', 'crystal'],
    Cuda: ['#3a4e3a', 'nvidia'],
    D: ['#ba595e', 'd'],
    Dart: ['#00b4ab', 'dart'],
    Dockerfile: ['#384d54', 'docker'],
    Elixir: ['#8847b9', 'elixir'],
    Elm: ['#60b5cc', 'elm'],
    'Emacs Lisp': ['#c065db', 'gnuemacs'],
    Erlang: ['#b83998', 'erlang'],
    'F#': ['#b845fc', 'fsharp'],
    Fortran: ['#4d41b1', 'fortran'],
    GDScript: ['#355570', 'godotengine'],
    Gleam: ['#ffaff3', 'gleam'],
    Go: ['#00add8', 'go'],
    GraphQL: ['#e10098', 'graphql'],
    Groovy: ['#4298b8', 'apachegroovy'],
    HCL: ['#844fba', 'hashicorp'],
    HTML: ['#e34c26', 'html5'],
    Handlebars: ['#f7931e', 'handlebarsdotjs'],
    Haskell: ['#5e5086', 'haskell'],
    Haxe: ['#df7900', 'haxe'],
    Java: ['#b07219', 'openjdk'],
    JavaScript: ['#f1e05a', 'javascript'],
    Jinja: ['#a52a22', 'jinja'],
    Julia: ['#a270ba', 'julia'],
    'Jupyter Notebook': ['#da5b0b', 'jupyter'],
    Kotlin: ['#a97bff', 'kotlin'],
    Less: ['#1d365d', 'less'],
    Lua: ['#000080', 'lua'],
    Luau: ['#00a2ff', 'luau'],
    MATLAB: ['#e16737'],
    MDX: ['#fcb32c', 'mdx'],
    Markdown: ['#083fa1', 'markdown'],
    Nim: ['#ffc200', 'nim'],
    Nix: ['#7e7eff', 'nixos'],
    OCaml: ['#ef7a08', 'ocaml'],
    'Objective-C': ['#438eff'],
    Odin: ['#60affe', 'odin'],
    PHP: ['#4f5d95', 'php'],
    Perl: ['#0298c3', 'perl'],
    PowerShell: ['#012456'],
    Processing: ['#0096d8', 'processingfoundation'],
    PureScript: ['#1d222d', 'purescript'],
    Python: ['#3572a5', 'python'],
    QML: ['#44a51c', 'qt'],
    R: ['#198ce7', 'r'],
    Racket: ['#3c5caa', 'racket'],
    ReScript: ['#ed5051', 'rescript'],
    Reason: ['#ff5847', 'reason'],
    Ruby: ['#701516', 'ruby'],
    Rust: ['#dea584', 'rust'],
    SCSS: ['#c6538c', 'sass'],
    Sass: ['#a53b70', 'sass'],
    Scala: ['#c22d40', 'scala'],
    ShaderLab: ['#222c37', 'unity'],
    Shell: ['#89e051', 'gnubash'],
    Solidity: ['#aa6746', 'solidity'],
    Starlark: ['#76d275', 'bazel'],
    Svelte: ['#ff3e00', 'svelte'],
    Swift: ['#f05138', 'swift'],
    TeX: ['#3d6117', 'latex'],
    TypeScript: ['#3178c6', 'typescript'],
    Typst: ['#239dad', 'typst'],
    V: ['#4f87c4', 'v'],
    Vala: ['#a56de2', 'vala'],
    'Vim Script': ['#199f4b', 'vim'],
    Vue: ['#41b883', 'vuedotjs'],
    WebAssembly: ['#04133b', 'webassembly'],
    Zig: ['#ec915c', 'zig']
  })
);

export const icon = (language: string) => KNOWN.get(language)?.[1];

export const drawn = new Set([...KNOWN.values()].flatMap(([, glyph]) => glyph ?? []));

/** A language's own colour, or grey for one we don't know */
export const tone = (language: string | null) =>
  (language && KNOWN.get(language)?.[0]) || 'var(--series-other)';

/** A language's colour with white on top if that still reads at 4.5:1, else black */
export function swatch(language: string) {
  const colour = KNOWN.get(language)?.[0];
  if (!colour) return undefined;
  const [red, green, blue] = [1, 3, 5].map((at) => {
    const channel = parseInt(colour.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return { colour, ink: 1.05 / (luminance + 0.05) >= 4.5 ? '#ffffff' : '#000000' };
}
