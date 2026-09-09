import { ConvexError } from "convex/values";
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export function validateAttachment(bytes:ArrayBuffer, mime:string, name:string) {
  if (!name.trim() || name.length>180 || bytes.byteLength===0 || bytes.byteLength>MAX_FILE_BYTES)
    throw new ConvexError("Choose a PDF, PNG or JPEG up to 4 MB.");
  const b=new Uint8Array(bytes);
  const starts=(values:number[])=>values.every((v,i)=>b[i]===v);
  const valid = mime==="application/pdf" ? starts([37,80,68,70,45]) : mime==="image/png" ? starts([137,80,78,71,13,10,26,10]) : mime==="image/jpeg" ? starts([255,216,255]) : false;
  if(!valid) throw new ConvexError("The file contents do not match a supported PDF, PNG or JPEG.");
}
