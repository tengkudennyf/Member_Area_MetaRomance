import tseslint from "typescript-eslint";

// ESLint flat config (P0): TypeScript strict-ish + guard service-role.
// next/core-web-vitals via FlatCompat bermasalah pada kombinasi
// eslint 9.39 + pnpm store ini (circular config) — TODO aktifkan saat selaras.
export default tseslint.config(
  { ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["components/**/*.{ts,tsx}", "emails/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/service",
              message: "Service role = SERVER ONLY. Jangan import dari Client Component.",
            },
          ],
        },
      ],
    },
  }
);
