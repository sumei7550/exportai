/// <reference types="vite/client" />

// Allow importing font files with ?url suffix
declare module '*.otf?url' {
  const url: string;
  export default url;
}

declare module '*.ttf?url' {
  const url: string;
  export default url;
}

declare module '*.woff?url' {
  const url: string;
  export default url;
}

declare module '*.woff2?url' {
  const url: string;
  export default url;
}
