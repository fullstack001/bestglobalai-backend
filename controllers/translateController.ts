import { Request, Response } from "express";
import translate from "google-translate-api-x";
import { JSDOM } from "jsdom";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Rotate through TLDs to reduce getting blocked
const TLDs = ["com", "com.hk", "co.kr", "co.jp", "com.tr", "com.br", "cn"];

const safeTranslate = async (text: string, targetLang: string): Promise<string> => {
  const maxRetries = 4;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const tld = TLDs[attempt % TLDs.length]; // Rotate TLDs
      const result = await translate(text, {
        to: targetLang,
        rejectOnPartialFail: false,
        tld,
      });

      if (result && result.text) return result.text;
      throw new Error("Translation returned no text");
    } catch (err: any) {
      attempt++;
      const wait = 1000 * attempt + Math.floor(Math.random() * 500); // backoff + jitter
      console.warn(`Retry #${attempt} for "${text.slice(0, 30)}..." in ${wait}ms:`, err?.message || err);
      await delay(wait);
    }
  }

  console.error(`Failed to translate "${text.slice(0, 30)}..." after ${maxRetries} attempts.`);
  return text; // fallback to original
};

const translateHtmlContent = async (html: string, targetLanguage: string) => {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const translateNodes = async (node: ChildNode): Promise<void> => {
    if (node.nodeType === 3) {
      const textContent = node.textContent?.trim();
      if (textContent) {
        const translated = await safeTranslate(textContent, targetLanguage);
        node.textContent = translated;
        await delay(500 + Math.random() * 500); // delay 500–1000ms between calls
      }
    } else if (node.nodeType === 1) {
      for (const child of Array.from(node.childNodes)) {
        await translateNodes(child);
      }
    }
  };

  for (const child of Array.from(document.body.childNodes)) {
    await translateNodes(child);
  }

  return document.body.innerHTML;
};

export const translateBookProcess = async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;
  try {
    const translatedHtml = await translateHtmlContent(text, targetLanguage);
    res.json({ translatedText: translatedHtml });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed. Please try again later." });
  }
};

export const translateVideoScriptProcess = async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;

  try {
    const translatedText = await safeTranslate(text, targetLanguage);
    const detection = await translate(text, { to: targetLanguage }) as {
      from: { language: { iso: string } };
    };

    res.json({
      originalLanguage: detection.from.language.iso,
      translatedText,
    });
  } catch (error) {
    console.error("Script translation error:", error);
    res.status(500).json({ error: "Script translation failed." });
  }
};
