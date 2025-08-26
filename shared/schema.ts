import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const plumbers = pgTable("plumbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company").notNull(),
  licenseNumber: text("license_number").notNull(),
  serviceRadius: integer("service_radius").notNull().default(25),
  isAvailable: boolean("is_available").notNull().default(false),
  rating: text("rating").default("4.9"),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plumberId: varchar("plumber_id").references(() => plumbers.id),
  customerName: text("customer_name"),
  customerLocation: text("customer_location"),
  issueDescription: text("issue_description"),
  status: text("status").notNull().default("pending"), // pending, active, completed, cancelled
  startTime: timestamp("start_time").default(sql`now()`),
  endTime: timestamp("end_time"),
  rating: integer("rating"),
  earnings: text("earnings"),
});

export const insertPlumberSchema = createInsertSchema(plumbers).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  company: true,
  licenseNumber: true,
  serviceRadius: true,
});

export const insertCallSchema = createInsertSchema(calls).pick({
  customerName: true,
  customerLocation: true,
  issueDescription: true,
});

export type InsertPlumber = z.infer<typeof insertPlumberSchema>;
export type Plumber = typeof plumbers.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

// Legacy user support for auth system
export const users = plumbers;
export type User = Plumber;
export type InsertUser = InsertPlumber;
export const insertUserSchema = insertPlumberSchema;
