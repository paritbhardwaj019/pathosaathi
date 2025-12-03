/**
 * Font Seeder
 * Seeds default fonts for PathoSaathi
 *
 * Run this script to seed fonts:
 * ts-node font.seed.ts
 */

import mongoose from "mongoose";
import chalk from "chalk";
import { DEFAULT_TENANTS } from "../config/tenant.config";
import ModelFactory from "../services/model-factory.service";
import { database } from "../config/db.config";

export const fontOptions = [
  {
    name: "Inter",
    fontFamily: "Inter, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    isActive: true,
  },
  {
    name: "Poppins",
    fontFamily: "Poppins, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
    isActive: true,
  },
  {
    name: "Roboto",
    fontFamily: "Roboto, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
    isActive: true,
  },
  {
    name: "Lato",
    fontFamily: "Lato, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
    isActive: true,
  },
  {
    name: "Noto Sans",
    fontFamily: "Noto Sans, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap",
    isActive: true,
  },
  {
    name: "Mukta",
    fontFamily: "Mukta, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap",
    isActive: true,
  },
  {
    name: "Hind",
    fontFamily: "Hind, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600;700&display=swap",
    isActive: true,
  },
  {
    name: "Noto Sans Devanagari",
    fontFamily: "Noto Sans Devanagari, sans-serif",
    googleFontUrl:
      "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap",
    isActive: true,
  },
];

const seedFonts = async () => {
  try {
    const isConnected = mongoose.connection.readyState === 1;

    if (!isConnected) {
      await database.connect();
      console.log(chalk.green("Connected to MongoDB"));
    }

    const FontModel = ModelFactory.getFontModel();

    console.log(chalk.blue("Seeding fonts..."));

    let createdCount = 0;
    let skippedCount = 0;

    for (const fontOption of fontOptions) {
      const existingFont = await FontModel.findOne({
        name: { $regex: new RegExp(`^${fontOption.name}$`, "i") },
        tenantPrefix: DEFAULT_TENANTS.ROOT,
      });

      if (existingFont) {
        console.log(
          chalk.yellow(
            `⏭️  Font "${fontOption.name}" already exists, skipping...`
          )
        );
        skippedCount++;
        continue;
      }

      const font = new FontModel({
        tenantPrefix: DEFAULT_TENANTS.ROOT,
        name: fontOption.name,
        fontFamily: fontOption.fontFamily,
        googleFontUrl: fontOption.googleFontUrl,
        isActive: fontOption.isActive,
        labs: [],
        partners: [],
      });

      await font.save();
      console.log(
        chalk.green(`✅ Created font "${fontOption.name}" (${font.identifier})`)
      );
      createdCount++;
    }

    console.log(chalk.green(`\n🎉 Font seeding complete!`));
    console.log(chalk.cyan(`   Created: ${createdCount} fonts`));
    console.log(chalk.cyan(`   Skipped: ${skippedCount} fonts`));

    if (!isConnected) {
      await database.disconnect();
      console.log(chalk.green("Disconnected from MongoDB"));
    }

    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red("Error seeding fonts:"), error);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

if (require.main === module) {
  seedFonts();
}

export default seedFonts;
