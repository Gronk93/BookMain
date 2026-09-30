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

  // Tiny 1x1 PNG image buffer for embedding into scanned/hybrid pages
  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  // 6. digital-5-pages.pdf (pure native digital text, >80 chars per page, no images)
  const docDigital = await PDFDocument.create();
  docDigital.setTitle("Ensayo sobre la Percepcion");
  docDigital.setAuthor("John Berger");
  for (let i = 1; i <= 5; i++) {
    const p = docDigital.addPage([500, 700]);
    p.drawText(`Capitulo ${i}: El acto de ver precede a las palabras`, { x: 50, y: 640, size: 14 });
    p.drawText(
      `La vista llega antes que las palabras. El nino mira y reconoce antes de poder hablar. ` +
        `Pero tambien hay otro sentido en el que el ver precede a las palabras. Es el ver lo que ` +
        `establece nuestro lugar en el mundo circundante; explicamos ese mundo con palabras, ` +
        `pero las palabras nunca pueden anular el hecho de que estamos rodeados por el. ` +
        `Texto extenso de prueba para la pagina numero ${i} con suficiente densidad de caracteres.`,
      { x: 50, y: 580, size: 10, maxWidth: 400, lineHeight: 14 },
    );
  }
  const bytesDigital = await docDigital.save();
  await fsp.writeFile(path.join(fixturesDir, "digital-5-pages.pdf"), bytesDigital);

  // 7. scanned-3-pages.pdf (pure scanned pages, images present, 0 native text)
  const docScanned = await PDFDocument.create();
  docScanned.setTitle("Documento Historico Escaneado");
  const embeddedImg1 = await docScanned.embedPng(samplePngBuffer);
  for (let i = 1; i <= 3; i++) {
    const p = docScanned.addPage([500, 700]);
    p.drawImage(embeddedImg1, { x: 40, y: 40, width: 420, height: 620 });
    // Zero native text drawn: completely image-based
  }
  const bytesScanned = await docScanned.save();
  await fsp.writeFile(path.join(fixturesDir, "scanned-3-pages.pdf"), bytesScanned);

  // 8. hybrid-3-pages.pdf (rich native text >= 80 chars AND embedded image)
  const docHybrid = await PDFDocument.create();
  docHybrid.setTitle("Manual Ilustrado con Texto");
  const embeddedImg2 = await docHybrid.embedPng(samplePngBuffer);
  for (let i = 1; i <= 3; i++) {
    const p = docHybrid.addPage([500, 700]);
    p.drawImage(embeddedImg2, { x: 50, y: 350, width: 400, height: 250 });
    p.drawText(`Figura y Texto Explicativo ${i}`, { x: 50, y: 300, size: 14 });
    p.drawText(
      `Este documento representa una pagina hibrida segun la clasificacion de BookMind. ` +
        `Combina un diagrama o ilustracion visual relevante con mas de ochenta caracteres ` +
        `de texto explicativo nativo que puede ser leido directamente sin requerir OCR forzoso.`,
      { x: 50, y: 260, size: 10, maxWidth: 400, lineHeight: 14 },
    );
  }
  const bytesHybrid = await docHybrid.save();
  await fsp.writeFile(path.join(fixturesDir, "hybrid-3-pages.pdf"), bytesHybrid);

  // 10. reader-100-pages.pdf (100-page book for deep navigation & pagination tests)
  const doc100 = await PDFDocument.create();
  doc100.setTitle("Cien Paginas de Conocimiento");
  doc100.setAuthor("BookMind Reader Test Suite");
  for (let i = 1; i <= 100; i++) {
    const p = doc100.addPage([500, 700]);
    p.drawText(`Capitulo ${i}: Exploracion de la Pagina ${i}`, { x: 50, y: 640, size: 14 });
    p.drawText(
      `Esta es la pagina numero ${i} del libro de prueba de 100 paginas disenado para ` +
        `verificar la navegacion profunda, restauracion de progreso, doble pagina y scroll continuo en BookMind. ` +
        `El lector debe ser capaz de navegar a la pagina 48 de manera inmediata y preservar el progreso.`,
      { x: 50, y: 590, size: 10, maxWidth: 400, lineHeight: 14 },
    );
  }
  const bytes100 = await doc100.save();
  await fsp.writeFile(path.join(fixturesDir, "reader-100-pages.pdf"), bytes100);

  console.log("All PDF fixtures generated successfully in scripts/fixtures/");
}

generate().catch((err) => {
  console.error("Failed to generate fixtures:", err);
  process.exit(1);
});
