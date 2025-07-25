import { Request, Response } from "express";
import Book from "../models/Book";
import User from "../models/User";
import Follower from "../models/Follower";
import Invite from "../models/Invite";
import SubscriberInvite from "../models/SubscriberInvite";
import JSZip from "jszip";
import slugify from "slugify";
import fs from "fs";
import path from "path";

// Define the structure of each file in Multer
interface MulterFile {
  filename: string;
}

// Define the structure of the Book document
interface Page {
  name: string;
  content: string;
}

interface AudioItem {
  title: string;
  fileUrl: string;
}

interface VideoItem {
  title: string;
  fileUrl: string;
}

const deleteFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const createBook = async (req: Request, res: Response) => {
  try {
    const { title, author, pages, audioItems, videoItems, youtubeItems } =
      req.body;
    const userId = req.user._id;

    // Extract files from Multer
    const coverImageFile = (req.files as { [fieldname: string]: MulterFile[] })[
      "coverImage"
    ]
      ? `/uploads/${
          (req.files as { [fieldname: string]: MulterFile[] })["coverImage"][0]
            .filename
        }`
      : null;

    const audioFiles =
      (req.files as { [fieldname: string]: MulterFile[] })["audioFiles"] || [];
    const videoFiles =
      (req.files as { [fieldname: string]: MulterFile[] })["videoFiles"] || [];

    // Parse and map audio items
    const audioItemData: AudioItem[] = audioItems
      ? JSON.parse(audioItems).map((audioItem: AudioItem, index: number) => ({
          title: audioItem.title,
          fileUrl: audioFiles[index]
            ? `/uploads/${audioFiles[index].filename}`
            : "",
        }))
      : [];

    // Parse and map video items
    const videoItemData: VideoItem[] = videoItems
      ? JSON.parse(videoItems).map((videoItem: VideoItem, index: number) => ({
          title: videoItem.title,
          fileUrl: videoFiles[index]
            ? `/uploads/${videoFiles[index].filename}`
            : "",
        }))
      : [];

    // Create new book document
    const newBook = new Book({
      title,
      author,
      coverImage: coverImageFile,
      pages: JSON.parse(pages),
      audioItems: audioItemData,
      videoItems: videoItemData,
      youtubeItems: youtubeItems ? JSON.parse(youtubeItems) : [],
      userId,
      bookType: "created",      
    });

    // Save the newBook document to MongoDB
    await newBook.save();

    const zip = new JSZip();
    const mimetype = "application/epub+zip";
    zip.file("mimetype", mimetype);

    const container =
      '<?xml version="1.0"?>' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
      "  <rootfiles>" +
      '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />' +
      "  </rootfiles>" +
      "</container>";
    zip.file("META-INF/container.xml", container);

    const metadata =
      '<?xml version="1.0"?>' +
      '<package version="3.0" xml:lang="en" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">' +
      '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
      `    <dc:title>${newBook.title}</dc:title>` +
      `    <dc:creator>${newBook.author}</dc:creator>` +
      "  </metadata>" +
      "  <manifest>" +
      newBook.pages
        .map(
          (_, index: number) =>
            `<item id="chapter${index}" href="chapter${index}.xhtml" media-type="application/xhtml+xml"/>`
        )
        .join("") +
      '    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>' +
      "  </manifest>" +
      '  <spine toc="toc">' +
      newBook.pages
        .map((_, index: number) => `<itemref idref="chapter${index}"/>`)
        .join("") +
      "</spine>" +
      "</package>";
    zip.file("OEBPS/content.opf", metadata);

    const toc =
      '<?xml version="1.0"?>' +
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">' +
      "  <head>" +
      '    <meta name="dtb:uid" content="urn:uuid:B9B412F2-CAAD-4A44-B91F-A375068478A0"/>' +
      '    <meta name="dtb:depth" content="1"/>' +
      '    <meta name="dtb:totalPageCount" content="0"/>' +
      '    <meta name="dtb:maxPageNumber" content="0"/>' +
      "  </head>" +
      "  <docTitle>" +
      `    <text>${newBook.title}</text>` +
      "  </docTitle>" +
      "  <navMap>" +
      newBook.pages
        .map(
          (page: Page, index: number) =>
            `<navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">` +
            `  <navLabel>` +
            `    <text>${page.name}</text>` +
            `  </navLabel>` +
            `  <content src="chapter${index}.xhtml"/>` +
            `</navPoint>`
        )
        .join("") +
      "  </navMap>" +
      "</ncx>";
    zip.file("OEBPS/toc.ncx", toc);

    newBook.pages.forEach((page: Page, index: number) => {    
      const sanitizedContent = page.content
        .replace(/<img([^>]+)>/gi, "<img$1 />") 
        .replace(/<p([^>]*)>(.*?)<\/?p>/gi, (_, pAttr, pContent) => {
          if (pContent.includes("<img")) {
            return (
              `<p${pAttr}>${pContent.replace(/<img[^>]+>/g, "")}</p>` +
              pContent.match(/<img[^>]+>/g).join("")
            );
          }
          return `<p${pAttr}>${pContent}</p>`;
        })
        .replace(/<br>/g, "<br />") 
        .replace(/&nbsp;/g, "\u00A0") 
        .replace(/<div([^>]*)>(.*?)<\/?div>/gi, "<div$1>$2</div>"); 

      const text =
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
        "<!DOCTYPE html>" +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">' +
        "<head>" +
        `  <title>${page.name}</title>` +
        "</head>" +
        "<body>" +
        `<section><h1>${page.name}</h1><p>${sanitizedContent}</p></section>` +
        "</body>" +
        "</html>";
      zip.file(`OEBPS/chapter${index}.xhtml`, text);
    });

    // Generate the EPUB file
    const ebookBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const ebookFilePath = path.join(
      __dirname,
      `../uploads/${newBook._id}.epub`
    );
    fs.writeFileSync(ebookFilePath, ebookBuffer);

    // Save the generated ebook file path in MongoDB
    newBook.ebookFile = `/uploads/${newBook._id}.epub`;
    await newBook.save();

    const watermarkZip = new JSZip();
    watermarkZip.file("mimetype", "application/epub+zip");

    // container.xml
    watermarkZip.file("META-INF/container.xml", `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
      </rootfiles>
    </container>`);

    // Add watermark image
    const logoPath = path.join(__dirname, "../assets/watermark.png");
    const logoBuffer = fs.readFileSync(logoPath);
    watermarkZip.file("OEBPS/logo.png", logoBuffer);

    // Build pages with watermark
    let manifestItems = "";
    let spineItems = "";
    let navPoints = "";

    newBook.pages.forEach((page: Page, index: number) => {
      const content = page.content
        .replace(/<img([^>]+)>/gi, "<img$1 />")
        .replace(/<br>/g, "<br />")
        .replace(/&nbsp;/g, "\u00A0");

      const pageHtml = `<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>${page.name}</title>
          <style>
            body {
              position: relative;
              font-family: Arial, sans-serif;
            }
            .watermark {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: -1;
              opacity: 0.1;
              background-image: url('logo.png');
              background-repeat: no-repeat;
              background-position: center;
              background-size: 200px;
            }
          </style>
        </head>
        <body>
          <div class="watermark"></div>
          <section><h1>${page.name}</h1><p>${content}</p></section>
        </body>
        </html>`;

        const filename = `chapter${index}.xhtml`;
        watermarkZip.file(`OEBPS/${filename}`, pageHtml);

        manifestItems += `<item id="chapter${index}" href="${filename}" media-type="application/xhtml+xml"/>`;
        spineItems += `<itemref idref="chapter${index}"/>`;
        navPoints += `<navPoint id="nav-${index}" playOrder="${index + 1}">
          <navLabel><text>${page.name}</text></navLabel>
          <content src="${filename}"/>
        </navPoint>`;
    });

    // Add logo & TOC
    manifestItems += `<item id="logo" href="logo.png" media-type="image/png"/>`;
    manifestItems += `<item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`;

    // content.opf
    const opf = `<?xml version="1.0"?>
    <package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${newBook.title}</dc:title>
        <dc:creator>${newBook.author}</dc:creator>
      </metadata>
      <manifest>
        ${manifestItems}
      </manifest>
      <spine toc="toc">
        ${spineItems}
      </spine>
    </package>`;
    watermarkZip.file("OEBPS/content.opf", opf);

    // toc.ncx
    const ncx = `<?xml version="1.0"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
      <head>
        <meta name="dtb:uid" content="urn:uuid:${newBook._id}"/>
      </head>
      <docTitle><text>${newBook.title}</text></docTitle>
      <navMap>${navPoints}</navMap>
    </ncx>`;
    watermarkZip.file("OEBPS/toc.ncx", ncx);

    // Save the file
    const watermarkEpubPath = path.join(__dirname, `../uploads/${newBook._id}_watermark.epub`);
    const watermarkBuffer = await watermarkZip.generateAsync({ type: "nodebuffer" });
    fs.writeFileSync(watermarkEpubPath, watermarkBuffer);
    newBook.watermarkFile = `/uploads/${newBook._id}_watermark.epub`;
    await newBook.save();

    // Send the response
    res
      .status(201)
      .json({ message: "Book created successfully!", book: newBook });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create book." });
  }
};

export const getMyBooks = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    // const books = await Book.find();
    const books = await Book.find({ userId }).populate("userId");
    res.status(200).json({ books });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch books." });
  }
};

export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const books = await Book.find();
    res.status(200).json({ books });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch books." });
  }
};

export const getPublicBooks = async (req: Request, res: Response) => {
  
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    //check if user is follower
    const follower = await Follower.findOne({ inviterId: user?._id });
    if (follower) {      
      const books = await Book.find({ userId, private: false }).populate("userId");
      res.status(200).json({ books });
    } else {
      const books = await Book.find({ private: false });
      res.status(200).json({ books });
    }
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch books." });
  }
};

export const getEbookContent = async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);

    if (!book || !book.ebookFile) {
      return res.status(404).json({ message: "Ebook not found" });
    }

    const ebookFilePath = path.join(__dirname, `../uploads/${book._id}.epub`);

    // Check if the file exists and serve it as a stream
    if (fs.existsSync(ebookFilePath)) {
      res.setHeader("Content-Type", "application/epub+zip");
      const fileStream = fs.createReadStream(ebookFilePath);
      fileStream.pipe(res);
    } else {
      res.status(404).json({ message: "Ebook file not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to retrieve ebook content." });
  }
};

export const getBookDetails = async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);
    const inviteToken = req.query.invite;

    if (inviteToken) {
      const invite = await Invite.findOne({ uuid: inviteToken});
      if (invite) {
        invite.viewed = true;
        invite.updatedAt = new Date();
        await invite.save();
      }
    }
    const subscriberInviteToken = req.query.subscriberInvite;
    if (subscriberInviteToken) {
      const subscriberInvite = await SubscriberInvite.findOne({ uuid: subscriberInviteToken });
      if (subscriberInvite) {
        subscriberInvite.viewed = true;
        subscriberInvite.viewCount += 1;
        subscriberInvite.updatedAt = new Date();
        await subscriberInvite.save();
      }
    }

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.status(200).json({ book });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to retrieve book details." });
  }
};

export const updateBook = async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;

    const { title, author, pages, audioItems, videoItems, youtubeItems } =
      req.body;
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Update basic fields (title, author, and pages)

    book.title = title || book.title;
    book.author = author || book.author;
    book.pages = pages ? JSON.parse(pages) : book.pages;
    book.bookType = "created";

    // Handle cover image replacement
    if (req.files && (req.files as any)["coverImage"]) {
      const coverImageFile = (
        req.files as { [fieldname: string]: MulterFile[] }
      )["coverImage"]
        ? `/uploads/${
            (req.files as { [fieldname: string]: MulterFile[] })[
              "coverImage"
            ][0].filename
          }`
        : null;

      if (coverImageFile) {
        // Delete the old cover image if a new one is provided
        if (book.coverImage) {
          const oldCoverImagePath = path.join(
            __dirname,
            `../uploads/${book.coverImage}`
          );
          deleteFile(oldCoverImagePath);
        }
        book.coverImage = coverImageFile;
      }
    }

    if (req.files && (req.files as any)["audioFiles"]) {
      const audioFiles =
        (req.files as { [fieldname: string]: MulterFile[] })["audioFiles"] ||
        [];

      if (audioItems) {
        var i = 0;
        const updatedAudioItems = JSON.parse(audioItems).map(
          (audioItem: AudioItem, index: number) => {
            if (audioItem.fileUrl == "") {
              const newFileUrl = `/uploads/${audioFiles[i].filename}`;
              if (book.audioItems[index]) {
                if (book.audioItems[index].fileUrl != newFileUrl) {
                  const oldAudioFilePath = path.join(
                    __dirname,
                    `../${book.audioItems[index].fileUrl}`
                  );
                  deleteFile(oldAudioFilePath);
                }
              }
              i++;
              return { title: audioItem.title, fileUrl: newFileUrl };
            } else {
              return { title: audioItem.title, fileUrl: audioItem.fileUrl };
            }
          }
        );
        book.audioItems = updatedAudioItems;
      }
    }

    if (req.files && (req.files as any)["videoFiles"]) {
      const videoFiles =
        (req.files as { [fieldname: string]: MulterFile[] })["videoFiles"] ||
        [];
      if (videoItems) {
        var i = 0;
        const updatedVideoItems = JSON.parse(videoItems).map(
          (videoItem: VideoItem, index: number) => {
            if (videoItem.fileUrl == "") {
              const newFileUrl = `/uploads/${videoFiles[i].filename}`;
              if (book.videoItems[index]) {
                if (book.videoItems[index].fileUrl != newFileUrl) {
                  const oldVideoFilePath = path.join(
                    __dirname,
                    `../${book.videoItems[index].fileUrl}`
                  );
                  deleteFile(oldVideoFilePath);
                }
              }
              i++;
              return { title: videoItem.title, fileUrl: newFileUrl };
            } else {
              return { title: videoItem.title, fileUrl: videoItem.fileUrl };
            }
          }
        );
        book.videoItems = updatedVideoItems;
      }
    }

    // Update YouTube items (no files involved here)
    if (youtubeItems) {
      book.youtubeItems = JSON.parse(youtubeItems);
    }

    // Save the updated book
    await book.save();

    // Now generate and store the ebook file using JSZip
    const zip = new JSZip();

    const mimetype = "application/epub+zip";
    zip.file("mimetype", mimetype);

    const container =
      '<?xml version="1.0"?>' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
      "  <rootfiles>" +
      '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />' +
      "  </rootfiles>" +
      "</container>";
    zip.file("META-INF/container.xml", container);

    const metadata =
      '<?xml version="1.0"?>' +
      '<package version="3.0" xml:lang="en" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">' +
      '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
      `    <dc:title>${book.title}</dc:title>` +
      `    <dc:creator>${book.author}</dc:creator>` +
      "  </metadata>" +
      "  <manifest>" +
      book.pages
        .map(
          (_: Page, index: number) =>
            `<item id="chapter${index}" href="chapter${index}.xhtml" media-type="application/xhtml+xml"/>`
        )
        .join("") +
      '    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>' +
      "  </manifest>" +
      '  <spine toc="toc">' +
      book.pages
        .map((_: Page, index: number) => `<itemref idref="chapter${index}"/>`)
        .join("") +
      "  </spine>" +
      "</package>";
    zip.file("OEBPS/content.opf", metadata);

    const toc =
      '<?xml version="1.0"?>' +
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">' +
      "  <head>" +
      '    <meta name="dtb:uid" content="urn:uuid:B9B412F2-CAAD-4A44-B91F-A375068478A0"/>' +
      '    <meta name="dtb:depth" content="1"/>' +
      '    <meta name="dtb:totalPageCount" content="0"/>' +
      '    <meta name="dtb:maxPageNumber" content="0"/>' +
      "  </head>" +
      "  <docTitle>" +
      `    <text>${book.title}</text>` +
      "  </docTitle>" +
      "  <navMap>" +
      book.pages
        .map(
          (page: Page, index: number) =>
            `<navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">` +
            `  <navLabel>` +
            `     <text>${page.name}</text>` +
            `  </navLabel>` +
            `  <content src="chapter${index}.xhtml"/>` +
            `</navPoint>`
        )
        .join("") +
      "  </navMap>" +
      "</ncx>";
    zip.file("OEBPS/toc.ncx", toc);

    // Store content pages as XHTML files
    book.pages.forEach((page: Page, index: number) => {
      // Fix issues related to <img> tags inside <p> tags
      const sanitizedContent = page.content
        .replace(/<img([^>]+)>/gi, "<img$1 />") // Self-close <img> tags
        .replace(/<p([^>]*)>(.*?)<\/?p>/gi, (_, pAttr, pContent) => {
          if (pContent.includes("<img")) {
            // If <p> contains <img>, split into separate <p> and <img /> outside
            return (
              `<p${pAttr}>${pContent.replace(/<img[^>]+>/g, "")}</p>` +
              pContent.match(/<img[^>]+>/g).join("")
            );
          }
          return `<p${pAttr}>${pContent}</p>`;
        })
        .replace(/<br>/g, "<br />") // Self-close <br> tags
        .replace(/&nbsp;/g, "\u00A0") // Replace non-breaking spaces
        .replace(/<div([^>]*)>(.*?)<\/?div>/gi, "<div$1>$2</div>"); // Ensure <div> tags are closed

      const text =
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
        "<!DOCTYPE html>" +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">' +
        "<head>" +
        `  <title>${page.name}</title>` +
        "</head>" +
        "<body>" +
        `<section><h1>${page.name}</h1><p>${sanitizedContent}</p></section>` +
        "</body>" +
        "</html>";
      zip.file(`OEBPS/chapter${index}.xhtml`, text);
    });
    // Generate the EPUB file
    const ebookBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const ebookFilePath = path.join(__dirname, `../uploads/${book._id}.epub`);
    fs.writeFileSync(ebookFilePath, ebookBuffer);

    // Add the generated ebook path to the book document
    book.ebookFile = `/uploads/${book._id}.epub`;
    await book.save();

    const watermarkZip = new JSZip();
    watermarkZip.file("mimetype", "application/epub+zip");

    // container.xml
    watermarkZip.file("META-INF/container.xml", `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
      </rootfiles>
    </container>`);

    // Add watermark image
    const logoPath = path.join(__dirname, "../assets/watermark.png");
    const logoBuffer = fs.readFileSync(logoPath);
    watermarkZip.file("OEBPS/logo.png", logoBuffer);

    // XHTML chapters
    let manifestItems = "";
    let spineItems = "";
    let navPoints = "";

    book.pages.forEach((page: Page, index: number) => {
      const content = page.content
        .replace(/<img([^>]+)>/gi, "<img$1 />")
        .replace(/<br>/g, "<br />")
        .replace(/&nbsp;/g, "\u00A0");

      const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <title>${page.name}</title>
      <style>
        body {
          position: relative;
          font-family: Arial, sans-serif;
        }
        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          opacity: 0.1;
          background-image: url('logo.png');
          background-repeat: no-repeat;
          background-position: center;
          background-size: 200px;
        }
      </style>
    </head>
    <body>
      <div class="watermark"></div>
      <section><h1>${page.name}</h1><p>${content}</p></section>
    </body>
    </html>`;

      const fileName = `chapter${index}.xhtml`;
      watermarkZip.file(`OEBPS/${fileName}`, xhtml);

      manifestItems += `<item id="chapter${index}" href="${fileName}" media-type="application/xhtml+xml"/>`;
      spineItems += `<itemref idref="chapter${index}"/>`;
      navPoints += `<navPoint id="nav-${index}" playOrder="${index + 1}">
        <navLabel><text>${page.name}</text></navLabel>
        <content src="${fileName}"/>
      </navPoint>`;
    });

    // Add logo & TOC
    manifestItems += `<item id="logo" href="logo.png" media-type="image/png"/>`;
    manifestItems += `<item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`;

    // content.opf
    const opf = `<?xml version="1.0"?>
    <package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${book.title}</dc:title>
        <dc:creator>${book.author}</dc:creator>
      </metadata>
      <manifest>
        ${manifestItems}
      </manifest>
      <spine toc="toc">
        ${spineItems}
      </spine>
    </package>`;
    watermarkZip.file("OEBPS/content.opf", opf);

    // toc.ncx
    const ncx = `<?xml version="1.0"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
      <head>
        <meta name="dtb:uid" content="urn:uuid:${book._id}"/>
      </head>
      <docTitle><text>${book.title}</text></docTitle>
      <navMap>${navPoints}</navMap>
    </ncx>`;
    watermarkZip.file("OEBPS/toc.ncx", ncx);

    // Save watermark EPUB
    const watermarkEpubPath = path.join(__dirname, `../uploads/${book._id}_watermark.epub`);
    const watermarkBuffer = await watermarkZip.generateAsync({ type: "nodebuffer" });
    fs.writeFileSync(watermarkEpubPath, watermarkBuffer);

    book.watermarkFile = `/uploads/${book._id}_watermark.epub`;
    await book.save();

    res.status(200).json({ message: "Book updated successfully!", book });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update book." });
  }
};

export const downloadEbook = async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);

    if (!book || !book.ebookFile) {
      return res.status(404).json({ message: "Ebook not found" });
    }

    const ebookFilePath = path.join(__dirname, `..${book.ebookFile}`);
    if (fs.existsSync(ebookFilePath)) {
      res.download(ebookFilePath, `${book.title}.epub`);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to download ebook." });
  }
};

export const deleteBook = async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const ebookFilePath = path.join(__dirname, `..${book.ebookFile}`);
    deleteFile(ebookFilePath);

    const watermarkEbookFilePath = path.join(
      __dirname,
      `..${book.watermarkFile}`
    );

    if (watermarkEbookFilePath) {
      deleteFile(watermarkEbookFilePath);
    }

    const coverImagePath = book.coverImage
      ? path.join(__dirname, `../${book.coverImage}`)
      : null;
    if (coverImagePath) deleteFile(coverImagePath);

    // Delete associated audio files
    if (book.audioItems && book.audioItems.length > 0) {
      book.audioItems.forEach((audioItem) => {
        const audioFilePath = path.join(__dirname, `../${audioItem.fileUrl}`);
        deleteFile(audioFilePath);
      });
    }

    // Delete associated video files
    if (book.videoItems && book.videoItems.length > 0) {
      book.videoItems.forEach((videoItem) => {
        const videoFilePath = path.join(__dirname, `../${videoItem.fileUrl}`);
        deleteFile(videoFilePath);
      });
    }

    await Book.deleteOne({ _id: bookId }); // Use deleteOne instead of remove

    res
      .status(200)
      .json({ message: "Book and associated files deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete book." });
  }
};

export const ebookUpload = async (req: Request, res: Response) => {
  try {
    const { title, author } = req.body;

    const coverImageFile = (req.files as { [fieldname: string]: MulterFile[] })[
      "coverImage"
    ]
      ? `/uploads/${
          (req.files as { [fieldname: string]: MulterFile[] })["coverImage"][0]
            .filename
        }`
      : null;

    const bookFile = (req.files as { [fieldname: string]: MulterFile[] })[
      "bookFile"
    ]
      ? `/uploads/${
          (req.files as { [fieldname: string]: MulterFile[] })["bookFile"][0]
            .filename
        }`
      : null;

    const newBook = new Book({
      title,
      author,
      coverImage: coverImageFile,
      ebookFile: bookFile,
      userId: req.user._id,
      bookType: "uploaded",
    });

    await newBook.save();

    res
      .status(201)
      .json({ message: "Book uploaded successfully", book: newBook });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to upload book" });
  }
};


export const makePublic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if(book.private === false) {
      book.private = true; // Change the private property to true (private)
      await book.save();
      res.status(200).json({ message: "private", book });
    }else{
      book.private = false; // Change the private property to false (public)
      await book.save();
      res.status(200).json({ message: "public", book });
    }

  

   
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update book privacy" });
  }
};