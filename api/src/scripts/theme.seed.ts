/**
 * Theme Seeder
 * Seeds default themes for PathoSaathi
 *
 * Run this script to seed themes:
 * ts-node theme.seed.ts
 */

import mongoose from "mongoose";
import chalk from "chalk";
import { DEFAULT_TENANTS } from "../config/tenant.config";
import ModelFactory from "../services/model-factory.service";
import { database } from "../config/db.config";
import { IFontModel } from "../models/font.model";

export const themeOptions = [
  {
    name: "Medical Blue Theme",
    description:
      "Most trusted theme for labs and hospitals. Perfect for trust-building.",
    primaryColor: "#1976D2",
    secondaryColor: "#4FC3F7",
    headingFont: "Poppins",
    bodyFont: "Inter",
    isEnabled: true,
  },
  {
    name: "Clean Clinical White Theme",
    description: "Premium theme for premium labs and diagnostics chains.",
    primaryColor: "#0D47A1",
    secondaryColor: "#E3F2FD",
    headingFont: "Inter",
    bodyFont: "Roboto",
    isEnabled: true,
  },
  {
    name: "Professional Navy Theme",
    description:
      "Corporate theme with high value appearance for corporate labs.",
    primaryColor: "#1A237E",
    secondaryColor: "#7986CB",
    headingFont: "Poppins",
    bodyFont: "Lato",
    isEnabled: true,
  },
  {
    name: "Health Green Theme",
    description:
      "Fresh, health-oriented theme for Ayush and preventive health.",
    primaryColor: "#2E7D32",
    secondaryColor: "#A5D6A7",
    headingFont: "Lato",
    bodyFont: "Inter",
    isEnabled: true,
  },
  {
    name: "Indian Trust Teal Theme",
    description:
      "Balanced, modern theme perfect for pathology labs. Very popular in diagnostics.",
    primaryColor: "#00695C",
    secondaryColor: "#26A69A",
    headingFont: "Poppins",
    bodyFont: "Noto Sans",
    isEnabled: true,
  },
  {
    name: "Ultra Minimal Grey Theme",
    description:
      "Technology focused theme with premium tech SaaS appearance (Zoho, Notion style).",
    primaryColor: "#263238",
    secondaryColor: "#CFD8DC",
    headingFont: "Inter",
    bodyFont: "Roboto",
    isEnabled: true,
  },
  {
    name: "Royal Maroon Medical Theme",
    description:
      "Strong identity theme for brands with bold personality. Popular in India for clinics.",
    primaryColor: "#7B1FA2",
    secondaryColor: "#CE93D8",
    headingFont: "Poppins",
    bodyFont: "Mukta",
    isEnabled: true,
  },
  {
    name: "Bharat Neutral Theme",
    description:
      "Indian language friendly theme perfect for partners serving Hindi/Marathi-speaking labs.",
    primaryColor: "#37474F",
    secondaryColor: "#90A4AE",
    headingFont: "Hind",
    bodyFont: "Noto Sans Devanagari",
    isEnabled: true,
  },
];

const seedThemes = async () => {
  try {
    const isConnected = mongoose.connection.readyState === 1;

    if (!isConnected) {
      await database.connect();
      console.log(chalk.green("Connected to MongoDB"));
    }

    const ThemeModel = ModelFactory.getThemeModel();
    const FontModel = ModelFactory.getFontModel() as IFontModel;

    console.log(chalk.blue("Seeding themes..."));

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const themeOption of themeOptions) {
      try {
        const existingTheme = await ThemeModel.findOne({
          name: { $regex: new RegExp(`^${themeOption.name}$`, "i") },
          tenantPrefix: DEFAULT_TENANTS.ROOT,
        });

        if (existingTheme) {
          console.log(
            chalk.yellow(
              `⏭️  Theme "${themeOption.name}" already exists, skipping...`
            )
          );
          skippedCount++;
          continue;
        }

        const headingFont = await FontModel.findByName(themeOption.headingFont);
        if (!headingFont) {
          console.log(
            chalk.red(
              `❌ Font "${themeOption.headingFont}" not found for theme "${themeOption.name}". Please seed fonts first.`
            )
          );
          errorCount++;
          continue;
        }

        const bodyFont = await FontModel.findByName(themeOption.bodyFont);
        if (!bodyFont) {
          console.log(
            chalk.red(
              `❌ Font "${themeOption.bodyFont}" not found for theme "${themeOption.name}". Please seed fonts first.`
            )
          );
          errorCount++;
          continue;
        }

        const theme = new ThemeModel({
          tenantPrefix: DEFAULT_TENANTS.ROOT,
          name: themeOption.name,
          description: themeOption.description,
          primaryColor: themeOption.primaryColor,
          secondaryColor: themeOption.secondaryColor,
          headingFont: headingFont._id,
          bodyFont: bodyFont._id,
          isEnabled: themeOption.isEnabled,
        });

        await theme.save();
        console.log(
          chalk.green(
            `✅ Created theme "${themeOption.name}" (${theme.identifier})`
          )
        );
        console.log(
          chalk.cyan(
            `   Colors: ${themeOption.primaryColor} / ${themeOption.secondaryColor}`
          )
        );
        console.log(
          chalk.cyan(
            `   Fonts: ${themeOption.headingFont} (heading) / ${themeOption.bodyFont} (body)`
          )
        );
        createdCount++;
      } catch (error) {
        console.error(
          chalk.red(`❌ Error creating theme "${themeOption.name}":`),
          error
        );
        errorCount++;
      }
    }

    console.log(chalk.green(`\n🎉 Theme seeding complete!`));
    console.log(chalk.cyan(`   Created: ${createdCount} themes`));
    console.log(chalk.cyan(`   Skipped: ${skippedCount} themes`));
    if (errorCount > 0) {
      console.log(chalk.red(`   Errors: ${errorCount} themes`));
    }

    if (!isConnected) {
      await database.disconnect();
      console.log(chalk.green("Disconnected from MongoDB"));
    }

    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red("Error seeding themes:"), error);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

if (require.main === module) {
  seedThemes();
}

export default seedThemes;
