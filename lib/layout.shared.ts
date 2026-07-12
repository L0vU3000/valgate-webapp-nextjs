import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): Omit<BaseLayoutProps, "tree"> {
  return {
    nav: {
      title: "Valgate Docs",
      url: "/docs",
    },
  };
}
