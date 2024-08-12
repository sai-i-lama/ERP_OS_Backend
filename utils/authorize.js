const { expressjwt: jwt } = require("express-jwt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
require("dotenv").config();

const secret = process.env.JWT_SECRET;

function authorize(requiredPermission) {
  return [
    jwt({ secret, algorithms: ["HS256"] }),

    async (req, res, next) => {
      try {
        const { role, sub, userType } = req.auth;
        console.log("UserType:", userType);
        console.log("Role:", role);
        console.log("Sub:", sub);

        let authenticatedEntity = null;

        if (userType === "user") {
          authenticatedEntity = await prisma.user.findUnique({
            where: { id: Number(sub) }
          });
          if (!authenticatedEntity) {
            return res.status(401).json({ message: "User not found" });
          }
          req.authenticatedRole = authenticatedEntity.role;
          req.authenticatedEntity = authenticatedEntity;
          req.authenticatedEntityType = "user";
        } else if (userType === "customer") {
          authenticatedEntity = await prisma.customer.findUnique({
            where: { id: Number(sub) }
          });
          if (!authenticatedEntity) {
            return res.status(401).json({ message: "Customer not found" });
          }
          req.authenticatedRole = authenticatedEntity.role;
          req.authenticatedEntity = authenticatedEntity;
          req.authenticatedEntityType = "customer";
        } else {
          return res.status(401).json({ message: "Invalid entity type" });
        }

        if (
          requiredPermission &&
          !req.auth.permissions.includes(requiredPermission)
        ) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        next();
      } catch (error) {
        console.error("Authorization error:", error);
        return res.status(401).json({ message: "Unauthorized" });
      }
    }
  ];
}

module.exports = authorize;
