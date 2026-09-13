import "dotenv/config";
import { migrate } from "../src/lib/db.js";

migrate();
 
console.log("Database schema is up to date.");
