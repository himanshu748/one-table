"use node";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { validateAttachment } from "./lib/attachments";
export const upload = action({
  args:{vendorId:v.id("vendors"),name:v.string(),mime:v.string(),bytes:v.bytes()},
  returns:v.id("messages"),
  handler:async(ctx,args):Promise<Id<"messages">>=>{
    validateAttachment(args.bytes,args.mime,args.name);
    await ctx.runMutation(internal.attachmentData.reserve,{vendorId:args.vendorId});
    const storageId=await ctx.storage.store(new Blob([args.bytes],{type:args.mime}));
    try {
      return await ctx.runMutation(internal.attachmentData.record,{vendorId:args.vendorId,storageId,name:args.name});
    } catch(error) { await ctx.storage.delete(storageId); throw error; }
  }
});
