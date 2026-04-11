import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const assetsDir = path.join(process.cwd(), "public", "assets", "c8marca");
  const urls: string[] = [];

  function walkDir(dir: string, baseRoute: string) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, `${baseRoute}/${f}`);
      } else {
        const ext = path.extname(f).toLowerCase();
        if ([".png", ".jpg", ".jpeg", ".svg"].includes(ext)) {
          // GrapesJS Asset Format
          urls.push(`${baseRoute}/${encodeURIComponent(f)}`);
        }
      }
    }
  }

  try {
    walkDir(assetsDir, "/assets/c8marca");
  } catch (e: any) {
    console.error("Asset config API falhou:", e);
  }

  return NextResponse.json({ assets: urls });
}
