import { NextResponse } from "next/server";
import { initDatabase } from "../../../../lib/db";

export async function POST() {
  try {
    // Force reinitialize database
    await initDatabase(true);

    return NextResponse.json({
      success: true,
      message: "تم إعادة تهيئة قاعدة البيانات بنجاح وإضافة العمود accessible_stages"
    });
  } catch (error: any) {
    console.error("Database initialization error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}