/**
 * Super Admin User Seeder
 * Creates PathoSaathi partner and super admin user
 * Also creates default identifier configurations
 *
 * Run this script to create the initial super admin:
 * ts-node super-admin.seed.ts
 */

import mongoose from "mongoose";
import { env } from "../config/env.config";
import inquirer from "inquirer";
import * as validator from "email-validator";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { ROLES } from "../config/role.config";
import { PARTNER_TYPES, PARTNER_FEES } from "../config/role.config";
import { PAYMENT_STATUS } from "../config/payment.config";
import { DEFAULT_TENANTS, TenantConfigManager } from "../config/tenant.config";
import ModelFactory from "../services/model-factory.service";
import { DatabaseIdentifierConfigManager } from "../services/database-identifier-configuration.service";
import { uploadImage } from "../utils/cloudinary.util";
import { IThemeModel } from "../models/theme.model";
import seedFonts from "./font.seed";

const validateEmail = (email: string) => {
  if (!validator.validate(email)) {
    return "Please enter a valid email address";
  }
  return true;
};

const validatePhone = (phone: string) => {
  if (phone && !/^[6-9]\d{9}$/.test(phone)) {
    return "Please enter a valid 10-digit Indian phone number";
  }
  return true;
};

const validatePassword = (password: string) => {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  return true;
};

const validateName = (name: string) => {
  if (name.length < 2) {
    return "Name must be at least 2 characters long";
  }
  return true;
};

const validateDomain = (domain: string) => {
  if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return "Please enter a valid domain (e.g., example.in)";
  }
  return true;
};

/**
 * Create default identifier configurations for PathoSaathi
 */
const createDefaultIdentifierConfigurations = async (
  partnerId: string,
  superAdminId: string
) => {
  try {
    console.log(chalk.blue("Creating default identifier configurations..."));

    const config =
      await DatabaseIdentifierConfigManager.createDefaultConfiguration(
        DEFAULT_TENANTS.ROOT,
        partnerId,
        "PathoSaathi",
        "PS",
        superAdminId
      );

    const modelNames = [
      "User",
      "Partner",
      "Lab",
      "Patient",
      "Test",
      "TestOrder",
      "LabSubscription",
      "Plan",
      "PlanType",
    ];

    for (const modelName of modelNames) {
      const defaultConfig = (config as any).getDefaultConfig(modelName);
      (config as any).updateModelConfig(modelName, defaultConfig);
    }

    await (config as any).save();

    console.log(chalk.green("✅ Default identifier configurations created!"));

    console.log(chalk.cyan("\n📋 Sample Generated Identifiers:"));

    const sampleIdentifiers = {
      User: "PS_USR_241129_0001",
      Partner: "PS_PTR_241129_0001",
      Lab: "PS_LAB_241129_0001",
      Patient: "PS_PAT_241129_0001",
      Test: "PS_TST_241129_0001",
      TestOrder: "PS_ORD_241129_0001",
      LabSubscription: "PS_SUB_241129_0001",
      Plan: "PS_PLN_241129_0001",
      PlanType: "PS_PLT_241129_0001",
    };

    Object.entries(sampleIdentifiers).forEach(([model, identifier]) => {
      console.log(chalk.gray(`   ${model}: ${identifier}`));
    });

    console.log(
      chalk.yellow(
        "\n💡 Partners can customize these formats through the portal!"
      )
    );
    console.log(
      chalk.yellow("   Example: Apollo -> APOLLO_PAT_29112024_00001")
    );
  } catch (error) {
    console.error(
      chalk.red("Error creating identifier configurations:"),
      error
    );
  }
};

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(chalk.green("Connected to MongoDB"));

    const UserModel = ModelFactory.getUserModel(DEFAULT_TENANTS.ROOT);
    const PartnerModel = ModelFactory.getPartnerModel();

    const superAdminCount = await UserModel.countDocuments({
      role: ROLES.SUPERADMIN,
    });

    if (superAdminCount > 0) {
      const { shouldContinue } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldContinue",
          message:
            "Super admin users already exist. Do you want to create another super admin?",
          default: false,
        },
      ]);

      if (!shouldContinue) {
        console.log(chalk.yellow("Operation cancelled."));
        await mongoose.disconnect();
        return;
      }
    }

    let pathosaathiPartner = await PartnerModel.findOne({
      companyName: /pathosaathi/i,
    });

    if (!pathosaathiPartner) {
      console.log(chalk.blue("Creating PathoSaathi partner..."));

      const partnerAnswers = await inquirer.prompt([
        {
          type: "input",
          name: "ownerName",
          message: "Enter PathoSaathi owner name:",
          default: "PathoSaathi Admin",
          validate: validateName,
        },
        {
          type: "input",
          name: "email",
          message: "Enter PathoSaathi partner email:",
          validate: validateEmail,
        },
        {
          type: "input",
          name: "phone",
          message: "Enter PathoSaathi partner phone:",
          validate: validatePhone,
        },
        {
          type: "input",
          name: "domain",
          message: "Enter PathoSaathi domain (optional, e.g., pathosaathi.in):",
          validate: validateDomain,
        },
      ]);

      TenantConfigManager.setTenantConfig(DEFAULT_TENANTS.ROOT, {
        collectionPrefix: DEFAULT_TENANTS.ROOT,
        identifierPrefix: "PS",
        companyName: "PathoSaathi",
      });

      pathosaathiPartner = new PartnerModel({
        tenantPrefix: DEFAULT_TENANTS.ROOT,
        companyName: "PathoSaathi",
        ownerName: partnerAnswers.ownerName,
        email: partnerAnswers.email,
        phone: partnerAnswers.phone,
        domain: partnerAnswers.domain || undefined,
        partnerType: PARTNER_TYPES.WHITE_LABEL,
        registrationFee: PARTNER_FEES[PARTNER_TYPES.WHITE_LABEL],
        paidStatus: PAYMENT_STATUS.PAID,
        isActive: true,
        onboardingCompleted: true,
        registrationDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        customIdentifierPrefix: "PS",
      });

      await pathosaathiPartner.save();
      console.log(chalk.green("✅ PathoSaathi partner created successfully!"));
    } else {
      console.log(chalk.blue("PathoSaathi partner already exists."));
    }

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: "Enter super admin email:",
        validate: validateEmail,
      },
      {
        type: "input",
        name: "phone",
        message: "Enter super admin phone (optional, press enter to skip):",
        validate: validatePhone,
      },
      {
        type: "input",
        name: "name",
        message: "Enter super admin name:",
        validate: validateName,
      },
      {
        type: "password",
        name: "password",
        message: "Enter super admin password:",
        mask: "*",
        validate: validatePassword,
      },
      {
        type: "confirm",
        name: "confirmCreate",
        message: "Create this super admin user?",
        default: true,
      },
    ]);

    if (!answers.confirmCreate) {
      console.log(chalk.yellow("Super admin creation cancelled."));
      await mongoose.disconnect();
      return;
    }

    const existingEmail = await UserModel.findOne({ email: answers.email });
    if (existingEmail) {
      console.log(chalk.red("An account with this email already exists."));
      await mongoose.disconnect();
      return;
    }

    if (answers.phone) {
      const existingPhone = await UserModel.findOne({ phone: answers.phone });
      if (existingPhone) {
        console.log(
          chalk.red("An account with this phone number already exists.")
        );
        await mongoose.disconnect();
        return;
      }
    }

    const superAdminUser = new UserModel({
      tenantPrefix: DEFAULT_TENANTS.ROOT,
      email: answers.email,
      phone: answers.phone || undefined,
      password: answers.password,
      name: answers.name,
      role: ROLES.SUPERADMIN,
      partner: pathosaathiPartner._id,
      ipAddress: "127.0.0.1",
      emailVerified: true,
      phoneVerified: !!answers.phone,
      isActive: true,
    });

    await superAdminUser.save();

    console.log(chalk.green("\n✅ Super admin user created successfully!"));

    console.log(
      chalk.blue(
        `   Associated with partner: ${pathosaathiPartner.companyName}`
      )
    );

    const partnerId =
      typeof pathosaathiPartner._id === "string"
        ? pathosaathiPartner._id
        : (pathosaathiPartner._id as mongoose.Types.ObjectId).toString();

    const superAdminId =
      typeof superAdminUser._id === "string"
        ? superAdminUser._id
        : (superAdminUser._id as mongoose.Types.ObjectId).toString();

    await createDefaultIdentifierConfigurations(partnerId, superAdminId);

    console.log(chalk.blue("\n📝 Seeding fonts..."));
    await seedFonts();

    const BrandingModel = ModelFactory.getBrandingModel();
    const ThemeModel = ModelFactory.getThemeModel() as IThemeModel;

    const existingBranding = await BrandingModel.findOne({
      tenantPrefix: DEFAULT_TENANTS.ROOT,
    });

    if (existingBranding) {
      console.log(
        chalk.yellow(
          "\n⚠️  A branding record already exists. Skipping branding creation."
        )
      );
    } else {
      console.log(chalk.blue("\n🎨 Creating branding for PathoSaathi..."));

      const brandingAnswers = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "Enter branding name:",
          default: "PathoSaathi Branding",
          validate: (input: string) => {
            if (input.length < 2) {
              return "Branding name must be at least 2 characters long";
            }
            return true;
          },
        },
        {
          type: "input",
          name: "description",
          message: "Enter branding description (optional):",
        },
        {
          type: "input",
          name: "themeIdentifier",
          message: "Enter theme identifier to link:",
          validate: async (input: string) => {
            if (!input || input.trim().length === 0) {
              return "Theme identifier is required";
            }
            const themeModel = ModelFactory.getThemeModel() as IThemeModel;
            const theme = await themeModel.findByIdentifier(
              input.toUpperCase()
            );
            if (!theme) {
              return `Theme with identifier "${input.toUpperCase()}" not found. Please check available themes.`;
            }
            return true;
          },
        },
      ]);

      const theme = await ThemeModel.findByIdentifier(
        brandingAnswers.themeIdentifier.toUpperCase()
      );

      if (!theme) {
        console.log(
          chalk.red(
            `❌ Theme with identifier "${brandingAnswers.themeIdentifier.toUpperCase()}" not found.`
          )
        );
        await mongoose.disconnect();
        process.exit(1);
      }

      console.log(chalk.blue("📤 Uploading logo to Cloudinary..."));

      const logoPath = path.resolve(
        __dirname,
        "../../public/pathosaathi-logo.png"
      );

      if (!fs.existsSync(logoPath)) {
        console.log(
          chalk.red(
            `❌ Logo file not found at: ${logoPath}\nPlease ensure the logo exists before running the seed.`
          )
        );
        await mongoose.disconnect();
        process.exit(1);
      }

      let logoUrl: string;
      try {
        const uploadResult = await uploadImage(logoPath, {
          folder: "pathosaathi/branding",
          tags: ["logo", "branding", "pathosaathi"],
        });
        logoUrl = uploadResult.url;
        console.log(
          chalk.green(`✅ Logo uploaded successfully: ${uploadResult.publicId}`)
        );
      } catch (error) {
        console.error(
          chalk.red("❌ Error uploading logo to Cloudinary:"),
          error
        );
        await mongoose.disconnect();
        process.exit(1);
      }

      const branding = new BrandingModel({
        tenantPrefix: DEFAULT_TENANTS.ROOT,
        name: brandingAnswers.name,
        description: brandingAnswers.description || undefined,
        logo: logoUrl,
        theme: theme._id,
        isActive: true,
      });

      await branding.save();

      console.log(
        chalk.green(
          `✅ Branding created successfully: ${branding.name} (${branding.identifier})`
        )
      );
      console.log(chalk.cyan(`   Theme: ${theme.name} (${theme.identifier})`));
      console.log(chalk.cyan(`   Logo URL: ${logoUrl}`));
    }

    console.log(chalk.green("\n🎉 Super Admin Setup Complete!"));

    await mongoose.disconnect();
    console.log(chalk.green("Disconnected from MongoDB"));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red("Error seeding super admin user:"), error);
    process.exit(1);
  }
};

seedSuperAdmin();
