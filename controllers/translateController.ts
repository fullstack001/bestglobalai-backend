import { Request, Response } from "express";
import translate from "@iamtraction/google-translate";
import { HttpsProxyAgent } from "https-proxy-agent";
import { JSDOM } from "jsdom";
const proxies = [
  "38.154.227.167:5868",
  "38.153.152.244:9594",
  "86.38.234.176:6630",
  "173.211.0.148:6641",
  "161.123.152.115:6360",
  "216.10.27.159:6837",
  "154.36.110.199:6853",
  "45.151.162.198:6600",
  "185.199.229.156:7492",
  "185.199.228.220:7300",
];
// Google Translate TLDs to rotate through to help avoid rate-limiting
const TLDs = ["com", "com.hk", "co.kr", "com.tr", "co.jp"];

// Optional in-memory cache to avoid re-translating same content
const cache = new Map<string, string>();

// Delay utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retryable and throttled translation function
const safeTranslate = async (
  text: string,
  targetLang: string
): Promise<string> => {
  // console.log(">>>>>>>>>>>", text, "<<<<<<<<<<<<<<<");
  const key = `${text}_${targetLang}`;
  if (cache.has(key)) return cache.get(key)!;

  const maxRetries = 4;
  let attempt = 0;

  // while (attempt < maxRetries) {
  try {
    const tld = TLDs[attempt % TLDs.length]; // Rotate TLDs
    const result = await translate(text, {
      to: targetLang,
    });

    if (result?.text) {
      cache.set(key, result.text); // Store in cache
      return result.text;
    }

    throw new Error("Empty translation result");
  } catch (err) {
    // const wait = 1000 * (attempt + 1) + Math.random() * 500;
    if (err instanceof Error) {
      console.warn(
        `>>>>>>Retry ${attempt + 1} for "${text.slice(0, 30)}..."`,
        err.message
      );
    } else {
      console.warn(`Retry ${attempt + 1} for "${text.slice(0, 30)}..."`, err);
    }
    // await delay(wait);
    attempt++;
    // }
  }

  console.error(`Translation failed after ${maxRetries} attempts: ${text}`);
  return text; // Return original text as fallback
};

// Translate each text node within HTML document body
const translateHtmlContent = async (html: string, targetLanguage: string) => {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const translateNodes = async (node: ChildNode): Promise<void> => {
    if (node.nodeType === 3) {
      const textContent = node.textContent?.trim();
      if (textContent) {
        const translated = await safeTranslate(textContent, targetLanguage);
        node.textContent = translated;
        // await delay(500 + Math.random() * 500); // 500–1000ms delay
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

// Translate HTML content
export const translateBookProcess = async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;

  try {
    const translatedHtml = await translateHtmlContent(text, targetLanguage);
    res.json({ translatedText: translatedHtml });
  } catch (error) {
    console.error("Translation error:", error);
    res
      .status(500)
      .json({ error: "Translation failed. Please try again later." });
  }
};

// Translate plain video script text
export const translateVideoScriptProcess = async (
  req: Request,
  res: Response
) => {
  const { text, targetLanguage } = req.body;

  try {
    const translatedText = await safeTranslate(text, targetLanguage);

    const detected = (await translate(text, {
      to: targetLanguage,
    })) as {
      from: { language: { iso: string } };
    };

    console.log(detected);

    res.json({
      originalLanguage: detected.from.language.iso,
      translatedText,
    });
  } catch (error) {
    console.error("Script translation error:", error);
    res.status(500).json({ error: "Script translation failed. Try again." });
  }
};
