// utils/invoiceGenerator.ts
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generateInvoicePDF = (
  fullName: string,
  email: string,
  plan: string,
  frequency: string,
  subscribedDate: Date,
  expiryDate: Date,
  subscriptions: any
): Promise<string> => {
  const subscriptionDetails = subscriptions.find(
    (sub: any) => sub.title === plan
  );

  const price = subscriptionDetails?.totalPrice || 0;
    // frequency === "yearly"
    //   ? subscriptionDetails.yearlyPrice
    //   : subscriptionDetails.monthlyPrice;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const fileName = `invoice-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, `../invoices/${fileName}`);
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Add logo image
    const logoPath = path.join(__dirname, "../assets/watermark.png");
    doc.image(logoPath, { fit: [200, 100], align: "center" }).moveDown();
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();
    doc
      .fontSize(20)
      .text("BestGlobalAI Subscription Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Name: ${fullName}`);
    doc.text(`Email: ${email}`);
    doc.text(`Plan: ${plan}`);
    doc.text(`Frequency: ${frequency}`);
    doc.text(`Price: $${price.toFixed(2)}`);
    doc.moveDown();
    doc.text(`Subscribed on: ${subscribedDate.toDateString()}`);
    doc.text(`Valid until: ${expiryDate.toDateString()}`);
    doc.moveDown();

    // doc.text("Included Features:", { underline: true });
    // doc.moveDown();

    // subscriptionDetails.features.forEach((feature: string) => {
    //   doc.text(`• ${feature}`);
    // });

    doc.moveDown();
    doc.text("Thank you for choosing BestGlobalAI!", { align: "center" });

    doc.end();

    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);
  });
};
