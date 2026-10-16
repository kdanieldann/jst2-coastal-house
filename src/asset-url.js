// Vite supplies the deployed base; Node tests use the site root.
export const assetUrl = name => `${import.meta.env?.BASE_URL ?? '/'}assets/${name}`;
