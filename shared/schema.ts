import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, decimal, json, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Auth codes table for SMS verification
export const authCodes = pgTable("auth_codes", {
  phoneNumber: text("phone_number").primaryKey(),
  code: text("code").notNull(),
  expires: timestamp("expires").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// User sessions table for authentication
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  userId: varchar("user_id").references(() => plumbers.id),
  createdAt: timestamp("created_at").default(sql`now()`),
  lastUsed: timestamp("last_used").default(sql`now()`),
});

export const plumbers = pgTable("plumbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company").notNull(),
  licenseNumber: text("license_number").notNull(),
  phoneNumber: text("phone_number").unique(),
  serviceRadius: integer("service_radius").notNull().default(25),
  isAvailable: boolean("is_available").notNull().default(false),
  rating: text("rating").default("4.9"),
  totalReviews: integer("total_reviews").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// CRM Tables - Define customers first since calls references it
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
  phoneNumber: text("phone_number").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  membershipStatus: text("membership_status").default("none"), // none, basic, premium
  membershipExpiry: timestamp("membership_expiry"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plumberId: varchar("plumber_id").references(() => plumbers.id),
  customerId: varchar("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone").notNull(),
  customerLocation: text("customer_location"),
  issueDescription: text("issue_description"),
  status: text("status").notNull().default("pending"), // pending, active, completed, cancelled
  startTime: timestamp("start_time").default(sql`now()`),
  endTime: timestamp("end_time"),
  rating: integer("rating"),
  earnings: text("earnings"),
});

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // repair, installation, maintenance, emergency
  estimatedDuration: integer("estimated_duration"), // in minutes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").unique(),
  category: text("category").notNull(), // pipes, fittings, tools, fixtures
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantityInStock: integer("quantity_in_stock").default(0),
  minimumStock: integer("minimum_stock").default(0),
  supplier: text("supplier"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id),
  customerId: varchar("customer_id").references(() => customers.id),
  plumberId: varchar("plumber_id").references(() => plumbers.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").default("draft"), // draft, sent, paid, overdue, cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  serviceId: varchar("service_id").references(() => services.id),
  inventoryId: varchar("inventory_id").references(() => inventory.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  callId: varchar("call_id").references(() => calls.id),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  category: text("category").default("general"), // general, photos, documents, estimates
  uploadedBy: varchar("uploaded_by").references(() => plumbers.id),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Chat Tables
export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").references(() => calls.id, { onDelete: "set null" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  plumberId: varchar("plumber_id").notNull().references(() => plumbers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active, archived, closed
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => ({
  idxChatsCustomer: index("idx_chats_customer").on(table.customerId),
  idxChatsPlumber: index("idx_chats_plumber").on(table.plumberId),
  idxChatsStatus: index("idx_chats_status").on(table.status),
  idxChatsLastMessage: index("idx_chats_last_message").on(table.lastMessageAt),
  idxChatsCallId: index("idx_chats_call_id").on(table.callId),
  // Ensure only one active chat per customer-plumber pair
  uniqueActiveChat: unique("unique_active_chat").on(table.customerId, table.plumberId, table.status),
}));

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull(), // customer or plumber ID
  senderType: text("sender_type").notNull(), // customer, plumber
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, image, file
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  idxMessagesChatCreated: index("idx_messages_chat_created").on(table.chatId, table.createdAt),
  idxMessagesSender: index("idx_messages_sender").on(table.senderId, table.senderType),
}));

// Relations
export const plumbersRelations = relations(plumbers, ({ many }) => ({
  calls: many(calls),
  invoices: many(invoices),
  files: many(files),
  chats: many(chats),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  calls: many(calls),
  invoices: many(invoices),
  files: many(files),
  chats: many(chats),
}));

export const callsRelations = relations(calls, ({ one, many }) => ({
  plumber: one(plumbers, {
    fields: [calls.plumberId],
    references: [plumbers.id],
  }),
  customer: one(customers, {
    fields: [calls.customerId],
    references: [customers.id],
  }),
  invoices: many(invoices),
  files: many(files),
  chats: many(chats),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  invoiceItems: many(invoiceItems),
}));

export const inventoryRelations = relations(inventory, ({ many }) => ({
  invoiceItems: many(invoiceItems),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  call: one(calls, {
    fields: [invoices.callId],
    references: [calls.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  plumber: one(plumbers, {
    fields: [invoices.plumberId],
    references: [plumbers.id],
  }),
  items: many(invoiceItems),
  files: many(files),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  service: one(services, {
    fields: [invoiceItems.serviceId],
    references: [services.id],
  }),
  inventoryItem: one(inventory, {
    fields: [invoiceItems.inventoryId],
    references: [inventory.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  customer: one(customers, {
    fields: [files.customerId],
    references: [customers.id],
  }),
  call: one(calls, {
    fields: [files.callId],
    references: [calls.id],
  }),
  invoice: one(invoices, {
    fields: [files.invoiceId],
    references: [invoices.id],
  }),
  uploader: one(plumbers, {
    fields: [files.uploadedBy],
    references: [plumbers.id],
  }),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  call: one(calls, {
    fields: [chats.callId],
    references: [calls.id],
  }),
  customer: one(customers, {
    fields: [chats.customerId],
    references: [customers.id],
  }),
  plumber: one(plumbers, {
    fields: [chats.plumberId],
    references: [plumbers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

// Insert Schemas and Types
export const insertPlumberSchema = createInsertSchema(plumbers).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallSchema = createInsertSchema(calls).pick({
  customerId: true,
  customerName: true,
  customerPhone: true,
  customerLocation: true,
  issueDescription: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  invoiceNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["active", "archived", "closed"]).default("active"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
}).extend({
  senderType: z.enum(["customer", "plumber"]),
  messageType: z.enum(["text", "image", "file"]).default("text"),
});

// Enhanced message schema with sender validation for API use
export const sendMessageSchema = insertMessageSchema.refine((data) => {
  return data.senderId && data.senderType && data.content && data.chatId;
}, {
  message: "senderId, senderType, content, and chatId are required",
  path: ["senderId"],
});

// Chat creation with sender validation
export const createChatSchema = insertChatSchema.extend({
  // Will be validated to ensure both participants exist
  customerId: z.string().min(1, "Customer ID is required"),
  plumberId: z.string().min(1, "Plumber ID is required"),
});

// Types
export type InsertPlumber = z.infer<typeof insertPlumberSchema>;
export type Plumber = typeof plumbers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// User type is now Plumber
export type User = typeof plumbers.$inferSelect;
export type InsertUser = InsertPlumber;
