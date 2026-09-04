import { readFileSync } from "fs";
import { join } from "path";
import { getDb } from "../src/db";
import { laboratories } from "../src/db/schema";
import { eq } from "drizzle-orm";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentWord = "";
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentWord);
      currentWord = "";
    } else {
      currentWord += char;
    }
  }
  result.push(currentWord);
  return result;
}

async function main() {
  const filePath = join(process.cwd(), "data", "BIS_Group1_Recognised_Laboratories.csv");
  const content = readFileSync(filePath, "utf-8");
  
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const db = getDb();
  let count = 0;
  
  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    if (fields.length < 6) continue;
    
    // Sl.No,Name of Lab,State,Status,OSL Code,Recognition Valid Up To,Remarks
    const [slNo, nameWithCity, state, status, oslCode, validUpTo, remarks] = fields;
    
    // Try to extract city from name "AES Laboratories (P) Ltd, Noida" -> "Noida"
    let name = nameWithCity.trim();
    let city = null;
    if (name.includes(",")) {
      const parts = name.split(",");
      city = parts[parts.length - 1].trim();
      name = parts.slice(0, parts.length - 1).join(",").trim();
    }
    
    // Very naive mock lat/lng based on city/state to populate map
    let lat = 20 + Math.random() * 10;
    let lng = 70 + Math.random() * 15;
    
    if (city?.toLowerCase().includes("delhi") || state.toLowerCase().includes("delhi")) {
      lat = 28.6139 + (Math.random() - 0.5) * 0.1;
      lng = 77.2090 + (Math.random() - 0.5) * 0.1;
    } else if (city?.toLowerCase().includes("mumbai") || state.toLowerCase().includes("maharashtra")) {
      lat = 19.0760 + (Math.random() - 0.5) * 0.1;
      lng = 72.8777 + (Math.random() - 0.5) * 0.1;
    } else if (city?.toLowerCase().includes("bangalore") || city?.toLowerCase().includes("bengaluru") || state.toLowerCase().includes("karnataka")) {
      lat = 12.9716 + (Math.random() - 0.5) * 0.1;
      lng = 77.5946 + (Math.random() - 0.5) * 0.1;
    } else if (city?.toLowerCase().includes("chennai") || state.toLowerCase().includes("tamil")) {
      lat = 13.0827 + (Math.random() - 0.5) * 0.1;
      lng = 80.2707 + (Math.random() - 0.5) * 0.1;
    }
    
    try {
      await db.insert(laboratories).values({
        name,
        state: state.trim(),
        city,
        status: status.trim(),
        oslCode: oslCode.trim(),
        recognitionValidUpTo: validUpTo?.trim(),
        remarks: remarks?.trim() || null,
        lat,
        lng,
        verificationStatus: "verified"
      });
      count++;
    } catch (err) {
      console.error(`Failed to insert lab ${name}:`, err);
    }
  }
  
  console.log(`Seeded ${count} laboratories successfully.`);
}

main().catch(console.error).finally(() => process.exit(0));
