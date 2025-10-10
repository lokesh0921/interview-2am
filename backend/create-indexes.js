#!/usr/bin/env node

/**
 * MongoDB Index Creation Script
 *
 * This script creates optimized indexes for the Summary search functionality.
 * Run this script to ensure all necessary indexes are created for optimal search performance.
 */

import mongoose from "mongoose";
import { getVectorConnection } from "./src/server/util/vectorMongo.js";

async function createIndexes() {
  try {
    console.log("🔗 Connecting to MongoDB...");

    // Get the vector search connection
    const connection = getVectorConnection();

    console.log("📊 Creating indexes for DocumentSummary collection...");

    // Get the DocumentSummary model
    const DocumentSummary = connection.model("DocumentSummary");

    // Create individual tag indexes for fast filtering
    console.log("  📝 Creating tag indexes...");
    await DocumentSummary.collection.createIndex({
      "extracted_tags.industries": 1,
    });
    await DocumentSummary.collection.createIndex({
      "extracted_tags.sectors": 1,
    });
    await DocumentSummary.collection.createIndex({
      "extracted_tags.stock_names": 1,
    });
    await DocumentSummary.collection.createIndex({
      "extracted_tags.general_tags": 1,
    });

    // Create compound indexes for better performance
    console.log("  🔗 Creating compound indexes...");
    await DocumentSummary.collection.createIndex({
      "extracted_tags.industries": 1,
      "extracted_tags.sectors": 1,
    });
    await DocumentSummary.collection.createIndex({
      "extracted_tags.stock_names": 1,
      summary_date: -1,
    });

    // Create text search index for full-text search
    console.log("  🔍 Creating text search index...");
    await DocumentSummary.collection.createIndex(
      {
        summary_text: "text",
        "extracted_tags.industries": "text",
        "extracted_tags.sectors": "text",
        "extracted_tags.stock_names": "text",
        "extracted_tags.general_tags": "text",
      },
      {
        name: "summary_text_search",
        weights: {
          summary_text: 10,
          "extracted_tags.industries": 5,
          "extracted_tags.sectors": 5,
          "extracted_tags.stock_names": 5,
          "extracted_tags.general_tags": 3,
        },
      }
    );

    // Create date-based indexes for sorting
    console.log("  📅 Creating date indexes...");
    await DocumentSummary.collection.createIndex({ summary_date: -1 });
    await DocumentSummary.collection.createIndex({ reference_date: 1 });

    // Create file_id index for joins
    console.log("  🔗 Creating file_id index...");
    await DocumentSummary.collection.createIndex({ file_id: 1 });

    console.log("✅ All indexes created successfully!");

    // List all indexes
    console.log("\n📋 Current indexes:");
    const indexes = await DocumentSummary.collection.listIndexes().toArray();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log("\n🎉 Index creation completed successfully!");
    console.log("\n💡 Search functionality is now optimized with:");
    console.log("   • Fast tag-based filtering");
    console.log("   • Full-text search across summaries and tags");
    console.log("   • Optimized sorting by date");
    console.log("   • Efficient joins with file metadata");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed.");
  }
}

// Run the script
createIndexes().catch(console.error);
