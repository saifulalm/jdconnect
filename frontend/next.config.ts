import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // output: "export" dinonaktifkan karena halaman edit menggunakan "use client"
  // Folder out akan dibuat manual melalui postbuild script (copy-to-out.js)
};

export default nextConfig;
