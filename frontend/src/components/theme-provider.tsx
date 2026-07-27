"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

const NextThemesProviderWithChildren =
  NextThemesProvider as unknown as React.ComponentType<React.PropsWithChildren<ThemeProviderProps>>;

type Props = ThemeProviderProps & { children: React.ReactNode };

export function ThemeProvider({ children, ...props }: Props) {
  return (
    <NextThemesProviderWithChildren attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProviderWithChildren>
  );
}
