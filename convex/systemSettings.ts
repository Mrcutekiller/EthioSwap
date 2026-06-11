import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("systemSettings").first();
  },
});

export const update = mutation({
  args: {
    id: v.id("systemSettings"),
    updates: v.any(),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify admin is actually an admin
    const adminUser = await ctx.db.get(args.adminId);
    if (!adminUser) {
      throw new Error("Admin user not found");
    }
    if (adminUser.role !== "admin") {
      throw new Error("Only admins can update system settings");
    }

    const oldSettings = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, args.updates);
    const newSettings = await ctx.db.get(args.id);

    // Log admin action
    await ctx.db.insert("adminAuditLogs", {
      adminId: args.adminId,
      adminUsername: adminUser.username,
      action: "update_system_settings",
      targetId: args.id,
      targetName: "System Settings",
      details: JSON.stringify(args.updates),
      createdAt: new Date().toISOString(),
    });

    // Check if etbRatePerDollar or etbRatePerDollarSell changed
    const priceChanged = 
      (oldSettings?.etbRatePerDollar !== newSettings?.etbRatePerDollar) ||
      (oldSettings?.etbRatePerDollarSell !== newSettings?.etbRatePerDollarSell);

    if (priceChanged) {
      // Get all active listings
      const activeListings = await ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();

      for (const listing of activeListings) {
        // Update the listing's customRateEtb to match admin's new price (based on listing type)
        const newRate = listing.type === "sell" 
          ? newSettings?.etbRatePerDollarSell || newSettings?.etbRatePerDollar 
          : newSettings?.etbRatePerDollar;
        
        await ctx.db.patch(listing._id, { customRateEtb: newRate });

        // Send notification to seller
        await ctx.db.insert("notifications", {
          userId: listing.sellerId,
          type: "price_update",
          title: "Price Updated by Admin",
          message: `Admin has updated the exchange rate. Your listing's rate has been changed to ${newRate} ETB per USD.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  },
});
