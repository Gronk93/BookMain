import { PDFDocument, rgb } from "pdf-lib";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "fixtures");

async function generate() {
  await fsp.mkdir(fixturesDir, { recursive: true });

  // 1. valid-1-page.pdf
  const doc1 = await PDFDocument.create();
  doc1.setTitle("Test Single Page");
  doc1.setAuthor("Author One");
  const p1 = doc1.addPage([400, 600]);
  p1.drawText("BookMind Single Page Test Fixture", { x: 50, y: 500, size: 14 });
  const bytes1 = await doc1.save();
  await fsp.writeFile(path.join(fixturesDir, "valid-1-page.pdf"), bytes1);

  // 2. valid-5-pages.pdf
  const doc5 = await PDFDocument.create();
  doc5.setTitle("Metodologia de Estudio");
  doc5.setAuthor("Investigador");
  for (let i = 1; i <= 5; i++) {
    const page = doc5.addPage([500, 700]);
    page.drawText(`Capitulo ${i}: Aprendizaje Profundo y Lectura`, { x: 50, y: 650, size: 16 });
    page.drawText(`Contenido de prueba de la pagina ${i} para BookMind BM-PRD-03.`, { x: 50, y: 600, size: 12 });
  }
  const bytes5 = await doc5.save();
  await fsp.writeFile(path.join(fixturesDir, "valid-5-pages.pdf"), bytes5);

  // 3. fake.pdf (signature failure)
  await fsp.writeFile(path.join(fixturesDir, "fake.pdf"), "This is plain text with a .pdf extension.");

  // 4. empty.pdf (0-byte file)
  await fsp.writeFile(path.join(fixturesDir, "empty.pdf"), "");

  // 5. corrupt.pdf (valid signature followed by corrupted data)
  await fsp.writeFile(path.join(fixturesDir, "corrupt.pdf"), "%PDF-1.4\nCorrupted binary garbage that cannot be parsed by pdf-lib %%EOF");

  console.log("All PDF fixtures generated successfully in scripts/fixtures/");
}

generate().catch((err) => {
  console.error("Failed to generate fixtures:", err);
  process.exit(1);
});
