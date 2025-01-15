import { Request, Response } from "express";
import translate from "google-translate-api-x";
import { JSDOM } from "jsdom";

// Function to sanitize and reconstruct HTML content for translation
const translateHtmlContent = async (html: string, targetLanguage: string) => {
  const dom = new JSDOM(html);
  const document = dom.window.document;


  // Extract text content from the HTML while preserving structure
  const translateNodes = async (node: ChildNode): Promise<void> => {
    if (node.nodeType === 3) {
      // Translate text nodes
      const textContent = node.textContent?.trim();
      if (textContent) {
        const result = await translate(textContent, { to: targetLanguage });
        node.textContent = result.text;
      }
    } else if (node.nodeType === 1) {
      // Recursively process child nodes for element nodes
      for (const child of Array.from(node.childNodes)) {
        await translateNodes(child);
      }
    }
  };

  // Start translation process from the body of the HTML
  for (const child of Array.from(document.body.childNodes)) {
    await translateNodes(child);
  }

  return document.body.innerHTML;
};

export const translateProcess = async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;

  try {
    const translatedHtml = await translateHtmlContent(text, targetLanguage);
    res.json({ translatedText: translatedHtml });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
};
