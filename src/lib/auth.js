import jwt from "jsonwebtoken";

export async function verifyAuth(req) {
  try {
    const token = req.cookies.get("sns_token")?.value;

    if (!token) {
      return {
        success: false,
        error: "No token provided",
      };
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    return {
      success: true,
      user: decoded,
    };

  } catch (error) {
    return {
      success: false,
      error: "Invalid or expired token",
    };
  }
}