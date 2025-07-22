import { Request, Response } from "express";
import { Types } from "mongoose";
import csvParser from "csv-parser";
import fs from "fs";
import path from "path";
import Follower from "../models/Follower";
import User from "../models/User";
import Category from "../models/Category";
import Invite from "../models/Invite";
import Mailgun from "mailgun.js";
import formData from "form-data";
import multer from "multer";
import dotenv from "dotenv";
import { sendInvites as sendInvitesTemplate } from "../config/mailTemplate";
dotenv.config();

const frontend_url = process.env.FRONTEND_URL;

interface MulterFile {
  filename: string;
  path: string;
}

//generate follwer link
export const generateInvite = async (req: Request, res: Response) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user || (!["superAdmin", "admin", "editor"].includes(user.role)) || !user.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can generate invites." });
    }
    const referralLink = `${frontend_url}/signup?ref=${user._id}`;
    res.json({ referralLink });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

//upload followers via csv
export const uploadFollowers = async (req: Request, res: Response) => {
  const csvHeaders = [
    "first_name",
    "last_name",
    "company_name",
    "address",
    "city",
    "country",
    "state",
    "zip",
    "phone1",
    "phone2",
    "email",
  ];

  const inviterId = req.user._id;
  try {
    const user = await User.findById(inviterId);
    if (!user || (!["superAdmin", "admin", "editor"].includes(user.role)) || !user.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can upload followers." });
    }

    // Ensure the uploaded file exists
    if (!req.files || !("csvFile" in req.files) || !req.files["csvFile"][0]) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const file = (req.files["csvFile"] as MulterFile[])[0];
    const csvFilePath = path.join(
      __dirname,
      "../uploads/followers",
      file.filename
    );
    console.log("Checking file at:", csvFilePath);
    if (!fs.existsSync(csvFilePath)) {
      return res.status(400).json({ message: "File does not exist." });
    }

    let defaultCategory = await Category.findOne({
      user: inviterId,
      isDefault: true,
    });

    if (!defaultCategory) {
      // create it if it doesn't exist
      defaultCategory = await Category.create({
        user: inviterId,
        name: "Default",
        isDefault: true,
      });
    }

    const followers: any[] = [];
    fs.createReadStream(csvFilePath)
      .pipe(csvParser({ headers: csvHeaders, skipLines: 1 }))
      .on("data", (row) => {
        followers.push({
          inviterId,
          firstName: row.first_name,
          lastName: row.last_name,
          companyName: row.company_name,
          address: row.address,
          city: row.city,
          country: row.country,
          state: row.state,
          zip: row.zip,
          phone1: row.phone1,
          phone2: row.phone2,
          email: row.email,
          status: "",
          referralCode: user._id,
          category : defaultCategory._id, // Assign default category
        });
      })
      .on("end", async () => {
        for (const followerData of followers) {
          const existingFollower = await Follower.findOne({
            email: followerData.email,
          });
          if (existingFollower) {
            // Update existing follower
            await Follower.findOneAndUpdate(
              { email: followerData.email },
              {
                inviterId: followerData.inviterId,
                firstName: followerData.firstName,
                lastName: followerData.lastName,
                companyName: followerData.companyName,
                address: followerData.address,
                city: followerData.city,
                country: followerData.country,
                state: followerData.state,
                zip: followerData.zip,
                phone1: followerData.phone1,
                phone2: followerData.phone2,
                status: followerData.status,
                referralCode: followerData.referralCode,
                category: followerData.category,
              }
            );
          } else {
            // Insert new follower
            const newFollower = new Follower(followerData);
            await newFollower.save();
          }
        }
        // await Follower.insertMany(followers);
    
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
        res.json({ message: "Followers uploaded successfully!" });
      });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const uploadHubspotFollowers = async (req: Request, res: Response) => {
  const inviterId = req.user._id;
  try {
    const user = await User.findById(inviterId);
    if (!user || (!["superAdmin", "admin", "editor"].includes(user.role)) || !user.isActive) {   
      return res.status(403).json({ message: "Only paid users can upload followers." });
    }

    if (!req.files || !("csvFile" in req.files) || !req.files["csvFile"][0]) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const file = (req.files["csvFile"] as MulterFile[])[0];
    const csvFilePath = path.join(__dirname, "../uploads/followers", file.filename);

    if (!fs.existsSync(csvFilePath)) {
      return res.status(400).json({ message: "File does not exist." });
    }

    const requiredHeaders = [
      "Name",
      "First name",
      "Last name",
      "Email",
      "Email Status",
      "Title",
      "Linkedin",
      "Location",
      "Added On",
      "Company Name",
      "Company Domain",
      "Company Website",
      "Company Employee Count",
      "Company Employee Count Range",
      "Company Founded",
      "Company Industry",
      "Company Type",
      "Company Headquarters",
      "Company Revenue Range",
      "Company Linkedin Url",
      "Company Crunchbase Url",
      "Company Funding Rounds",
      "Company Last Funding Round Amount",
      "Company Logo Url Primary",
      "Company Logo Url Secondary",      
    ];

    const followers: any[] = [];
    let headersValidated = false;
    const stream = fs.createReadStream(csvFilePath);

    let defaultCategory = await Category.findOne({
      user: inviterId,
      isDefault: true,
    });

    if (!defaultCategory) {
      // create it if it doesn't exist
      defaultCategory = await Category.create({
        user: inviterId,
        name: "Default",
        isDefault: true,
      });
    }

    stream
      .pipe(csvParser())
      .on("headers", (headers) => {
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          headersValidated = false;
          console.error(`Invalid CSV headers. Missing: ${missingHeaders.join(", ")}`);         
          stream.destroy();
          return res.status(400).json({
            message: `Invalid CSV headers. Missing: ${missingHeaders.join(", ")}`,
          });
        } else {
          headersValidated = true;
        }
      })
      .on("data", (row) => {
        if (!headersValidated) return;

        // Only transform valid emails
        const email = row["Email"]?.trim().toLowerCase();
        if (!email) return;

        followers.push({
          inviterId,
          firstName: row["First name"] || "",
          lastName: row["Last name"] || "",
          companyName: row["Company Name"], // Not available in HubSpot export
          address: "",
          city: "",
          country: "",
          state: "",
          zip: "",
          phone1: "",
          phone2: "", // HubSpot only gives 1 phone
          email,
          status: "",
          referralCode: String(inviterId),
          category: defaultCategory._id, // Assign default category
        });
      })
      .on("end", async () => {
        for (const followerData of followers) {
          const existingFollower = await Follower.findOne({ email: followerData.email });
          if (existingFollower) {
            await Follower.findOneAndUpdate({ email: followerData.email }, followerData);
          } else {
            const newFollower = new Follower(followerData);
            await newFollower.save();
          }
        }

        fs.unlinkSync(csvFilePath);
        res.json({ message: "Leads to followers uploaded and formatted successfully." });
      })
      .on("error", (err) => {
        console.error("CSV parse error:", err);
        res.status(500).json({ message: "Error parsing CSV file." });
      });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

function getEbookIdFromLink(link: string): string | null {
  try {
    const url = new URL(link); // Parse the URL
    const segments = url.pathname.split('/'); // Split the pathname into segments
    return segments.pop() || null; // Get the last segment (ebookId)
  } catch (error) {
    console.error("Invalid URL:", error);
    return null; // Return null if the URL is invalid
  }
}

//send invitations to followers by using mailgun
export const sendInvites = async (req: Request, res: Response) => {
  try {
    const followerId = req.params.id;
    const inviterId = req.user._id;
    const ebookLink = req.body.ebookLink; // Get ebook link from request body


    const follower = await Follower.findById(followerId);
    if (!follower) {
      return res.status(403).json({ message: "Follower not found" });
    }
    follower.status = "Pending"; // Set status to Pending
    await follower.save();

    const inviter = await User.findById(inviterId);
    if (!inviter || (!["superAdmin", "admin", "editor"].includes(inviter.role)) || !inviter.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can send invites." });
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "your-mailgun-api-key",
    });

    let ebookId = getEbookIdFromLink(ebookLink);

    const invite = new Invite({
      inviterId: new Types.ObjectId(inviterId),
      followerId: new Types.ObjectId(followerId),
      bookId: ebookId, 
      uuid: crypto.randomUUID(), 
      viewed: false,
    });
    await invite.save();

    let inviteId = invite.uuid;

    const inviteLink = `${frontend_url}/signup?ref=${follower.referralCode}`;
    const htmlContent = sendInvitesTemplate(
      String(inviteLink),
      String(follower.firstName),
      String(follower.lastName),
      String(ebookLink),
      String(inviteId) 
    );     

    const emailData = {
      from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
      to: follower.email,
      subject: "You're Invited to Join!",
      html: htmlContent,
    };
    try {
      await mg.messages.create(
        process.env.MAILGUN_DOMAIN || "your-mailgun-domain",
        emailData
      ); 
      res.json({ message: "Invitations sent!" });
    } catch (error) {
      console.error(`Failed to send email to ${follower.email}:`, error);
      return res.status(500).json({ message: "Failed to send invitation." });

    }

    
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

//update follower status by signup
export const updateFollowerStatus = async (req: Request, res: Response) => {
  try {
    const follower = await Follower.findById(req.params.id);
    if (!follower)
      return res.status(404).json({ message: "Follower not found" });
    const updatedFollower = await Follower.findByIdAndUpdate(
      req.params.id,
      { status: "Active" },
      { new: true }
    );
    res.status(200).json(updatedFollower);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Get all followers
export const getFollowers = async (req: Request, res: Response) => {
  const inviterId = req.user._id;
  try {
    // const followers = await Follower.find({ inviterId });
    const followers = await Follower.find({ inviterId }).populate("category", "_id name isDefault");

    const emails = followers.map((f) => f.email);
    const existingUsers = await User.find({ email: { $in: emails } });

    const followersWithStatus = await Promise.all(
      followers.map(async (follower) => {
        const isRegistered = existingUsers.some((u) => u.email === follower.email);
        const latestInvite = await Invite.findOne({ followerId: follower._id, inviterId: inviterId })
          .sort({ createdAt: -1 }) // Sort by creation date in descending order
          .select("viewed updatedAt"); // Only fetch the 'viewed' field

          let formattedUpdatedAt: string | null = null;

          if (latestInvite?.updatedAt && !isNaN(new Date(latestInvite.updatedAt).getTime())) {
            const date = new Date(latestInvite.updatedAt);
            formattedUpdatedAt = date.toLocaleString("en-GB", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).replace(",", "");
          }
         
          
        return {
          ...follower.toObject(),
          status: isRegistered ? "Active" : follower.status,
          category: follower.category, 
          viewed: latestInvite ? latestInvite.viewed : "", // Add viewed status
          updatedAt: latestInvite ? formattedUpdatedAt : "", // Add updatedAt field
        };
      })
    );

    res.json({ followers: followersWithStatus });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const fetchFollowersByCategory = async (req: Request, res: Response) => {
  const inviterId = req.user._id;  
  const selectedCategory = req.body.categoryId;
  try {
    const followers = await Follower.find({ inviterId }).populate("category", "_id name isDefault");
    if (!followers || followers.length === 0) {
      return res.status(404).json({ message: "No followers found." });
    }
   
    const filteredFollowers = selectedCategory === "all"
      ? followers
      : followers.filter(f => (f.category as any)?._id?.toString() === selectedCategory);

    const emails = filteredFollowers.map((f) => f.email);
    const existingUsers = await User.find({ email: { $in: emails } });

    const followersWithStatus = filteredFollowers.map((follower) => {
      const isRegistered = existingUsers.some((u) => u.email === follower.email);
      return {
        ...follower.toObject(),
        status: isRegistered ? "Active" : follower.status,
        category: follower.category, 
      };
    });

    res.json({ followers: followersWithStatus });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  } 
};

// Add a new follower
export const addFollower = async (req: Request, res: Response) => {
  const follower = new Follower(req.body);
  try {
    const newFollower = await follower.save();
    res.status(201).json(newFollower);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// Delete a follower
export const deleteFollower = async (req: Request, res: Response) => {
  try {
    const follower = await Follower.findById(req.params.id);
    if (!follower)
      return res.status(404).json({ message: "Follower not found" });

    await Follower.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "Follower deleted" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Get a follower
export const getFollower = async (req: Request, res: Response) => {
  const follower = await Follower.findById(req.params.id);
  res.json(follower);
};


export const sendBulkInvites = async (req: Request, res: Response) => {
  try {
    const { followerIds, ebookLink } = req.body;
    const inviterId = req.user._id;

    const inviter = await User.findById(inviterId);
    if (!inviter || (!["superAdmin", "admin", "editor"].includes(inviter.role)) || !inviter.isActive) {
      return res.status(403).json({ message: "Only paid users can send invites." });
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY!,
    });

    const followers = await Follower.find({ _id: { $in: followerIds } });
    const sentEmails: string[] = [];

    for (const followerData of followers) {
      const follower = await Follower.findById(followerData._id); // Fetch as Mongoose document
      if (!follower) {
        return res.status(403).json({ message: "Follower not found" });
      }
      follower.status = "Pending"; // Set status to Pending
      await follower.save();
      try {
      const inviteLink = `${frontend_url}/signup?ref=${follower.referralCode}`;
      let ebookId = getEbookIdFromLink(ebookLink);
      let followerId = (follower._id as Types.ObjectId).toString();

      const invite = new Invite({
        inviterId: new Types.ObjectId(inviterId),
        followerId: new Types.ObjectId(followerId),
        bookId: ebookId, 
        uuid: crypto.randomUUID(), 
        viewed: false,
      });
      await invite.save();  

      let inviteId = invite.uuid; 

      const htmlContent = sendInvitesTemplate(
        String(inviteLink),
        String(follower.firstName),
        String(follower.lastName),
        String(ebookLink),
        String(inviteId) 
      );     
    

      const emailData = {
        from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
        to: follower.email,
        subject: "You're Invited to Join!",
        html: htmlContent,
      };
      
        await mg.messages.create(process.env.MAILGUN_DOMAIN!, emailData);
        sentEmails.push(follower.email);
      } catch (error) {
        console.error(`Failed to send email to ${follower.email}:`, error);
      }
    }

    res.json({ message: `Invitations sent to ${sentEmails.length} followers.` });
  } catch (err: any) {
    console.error("sendBulkInvites failed:", err.message);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
};


export const deleteBulkFollowers = async (req: Request, res: Response) => {
  const { followerIds } = req.body;
  try {
    await Follower.deleteMany({ _id: { $in: followerIds } });
    res.status(200).json({ message: "Selected followers deleted." });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateFollowerCategory = async (req: Request, res: Response) => {
  try {
    const { followerId, categoryId } = req.body;

    const follower = await Follower.findById(followerId);
    if (!follower) return res.status(404).json({ message: "Follower not found." });

    follower.category = categoryId;
    await follower.save();

    res.status(200).json({ message: "Follower category updated." });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};


export const updateBulkFollowerCategory = async (req: Request, res: Response) => {
  try {
    const { followerIds, categoryId } = req.body;

    if (!Array.isArray(followerIds) || followerIds.length === 0) {
      return res.status(400).json({ message: "No followers selected." });
    }

    await Follower.updateMany(
      { _id: { $in: followerIds } },
      { $set: { category: categoryId } }
    );

    res.status(200).json({ message: "Follower categories updated successfully." });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};