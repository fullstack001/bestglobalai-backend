import { Request, Response } from "express";
import translate from "google-translate-api-x";
import { JSDOM } from "jsdom";

// Delay utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Translate with retry-on-failure logic
const safeTranslate = async (text: string, targetLang: string): Promise<string> => {
  try {
    const result = await translate(text, {
      to: targetLang,
      rejectOnPartialFail: false,
    });
    return result?.text || text;
  } catch (err) {
    console.warn(`Initial translation failed for "${text}". Retrying...`, err);
    await delay(500); // wait 1s before retrying
    try {
      const retryResult = await translate(text, { to: targetLang });
      return retryResult?.text || text;
    } catch (retryErr) {
      console.error(`Retry failed for "${text}"`, retryErr);
      return text; // fallback to original
    }
  }
};

// Translate HTML with throttling between text nodes
const translateHtmlContent = async (html: string, targetLanguage: string) => {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const translateNodes = async (node: ChildNode): Promise<void> => {
    if (node.nodeType === 3) {
      const textContent = node.textContent?.trim();
      if (textContent) {
        const translatedText = await safeTranslate(textContent, targetLanguage);
        node.textContent = translatedText;

        // Add a delay between requests to avoid rate-limiting
        await delay(600 + Math.random() * 400); // 600–1000ms delay
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
    res.status(500).json({ error: "Failed to translate text" });
  }
};

export const translateVideoScriptProcess = async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;

  try {
    const translatedText = await safeTranslate(text, targetLanguage);

    const detectedLang = await translate(text, {
      to: targetLanguage,
    }) as {
      from: { language: { iso: string } };
    };

    res.json({
      originalLanguage: detectedLang.from.language.iso,
      translatedText,
    });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Failed to translate video script" });
  }
};
