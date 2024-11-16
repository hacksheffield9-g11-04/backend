const jwt = require("jsonwebtoken");
const { ENV } = require("./constants");

const checkAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || ""; // should be in "Bearer [token]" format
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    console.log(error);
    // If the token is invalid or expired, an error will be thrown
    if (error.name === "TokenExpiredError") {
      return res.status(400).send("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      return res.status(400).send("Invalid token");
    }
    return next(error);
  }
};

module.exports = { checkAuth };
